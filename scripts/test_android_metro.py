"""Bounded Metro preflight checks, without starting a server or emulator."""
import importlib.util
import io
from pathlib import Path
import unittest
from unittest.mock import Mock
from urllib.error import HTTPError, URLError
import subprocess


SPEC = importlib.util.spec_from_file_location('android_metro', Path(__file__).with_name('android-metro.py'))
metro = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(metro)


class Response(io.BytesIO):
    status = 200


class MetroPreflightTest(unittest.TestCase):
    def test_port_validation_and_cli_precedence(self):
        self.assertEqual(metro.port_for([], {}), 8081)
        self.assertEqual(metro.port_for([], {'RCT_METRO_PORT': '8090'}), 8090)
        self.assertEqual(metro.port_for(['--port', '8091'], {'RCT_METRO_PORT': '8090'}), 8091)
        self.assertEqual(metro.port_for(['--port=8092'], {}), 8092)
        for args in (['--port'], ['--port=0'], ['--port', '65536'], ['--port', 'http://other']):
            with self.subTest(args=args), self.assertRaises(ValueError):
                metro.port_for(args, {})

    def test_ready_status_then_streams_bundle_from_loopback(self):
        opener = Mock()
        opener.open.side_effect = [Response(b'packager-status:running'), Response(b'javascript')]
        metro.check(8081, opener=opener)
        urls = [call.args[0] for call in opener.open.call_args_list]
        self.assertEqual(urls[0], 'http://127.0.0.1:8081/status')
        self.assertTrue(urls[1].startswith('http://127.0.0.1:8081/index.bundle?'))
        self.assertIn('platform=android', urls[1])

    def test_absent_metro_explains_start_command(self):
        opener = Mock()
        opener.open.side_effect = URLError('refused')
        with self.assertRaisesRegex(RuntimeError, 'npm start'):
            metro.check(8081, opener=opener)
        self.assertEqual(opener.open.call_count, 1)

    def test_other_service_does_not_trigger_bundle_request(self):
        opener = Mock()
        opener.open.return_value = Response(b'<html>other service</html>')
        with self.assertRaisesRegex(RuntimeError, 'Metro'):
            metro.check(8081, opener=opener)
        self.assertEqual(opener.open.call_count, 1)

    def test_empty_or_failed_bundle_is_rejected(self):
        for response in (Response(b''), URLError('bundle failed')):
            opener = Mock()
            opener.open.side_effect = [Response(b'packager-status:running'), response]
            with self.subTest(response=response), self.assertRaisesRegex(RuntimeError, 'bundle'):
                metro.check(8081, opener=opener)

    def test_bundle_size_is_bounded(self):
        opener = Mock()
        opener.open.side_effect = [Response(b'packager-status:running'), Response(b'123456789')]
        with self.assertRaisesRegex(RuntimeError, 'size'):
            metro.check(8081, opener=opener, max_bytes=8)

    def test_total_bundle_deadline_is_bounded(self):
        opener = Mock()
        opener.open.side_effect = [Response(b'packager-status:running'), Response(b'javascript')]
        clock = Mock(side_effect=[0, 121])
        with self.assertRaisesRegex(RuntimeError, 'timed out'):
            metro.check(8081, opener=opener, clock=clock)

    def test_redirects_are_rejected(self):
        with self.assertRaises(HTTPError) as caught:
            metro.NoRedirect().redirect_request(None, None, 302, '', {}, 'http://other/')
        caught.exception.close()

    def test_device_waits_for_its_actual_metro_connection(self):
        runner = Mock(side_effect=[
            subprocess.CompletedProcess([], 0, '1\n', ''),
            subprocess.CompletedProcess([], 0, '', ''),
            subprocess.CompletedProcess([], 0, 'HTTP/1.1 200 OK\r\n\r\npackager-status:running', ''),
        ])
        pause = Mock()
        metro.check_device(8081, 'fixture-serial', runner=runner, pause=pause)
        self.assertEqual(pause.call_count, 1)
        self.assertIn('10.0.2.2', runner.call_args_list[-1].args[0][-1])

    def test_device_connection_has_a_deadline(self):
        runner = Mock(side_effect=[
            subprocess.CompletedProcess([], 0, '0', ''),
            subprocess.CompletedProcess([], 0, '', ''),
        ])
        clock = Mock(side_effect=[0, 0, 61])
        with self.assertRaisesRegex(RuntimeError, 'device cannot reach Metro'):
            metro.check_device(8081, 'fixture', runner=runner, clock=clock, pause=Mock())

    def test_device_check_uses_reverse_endpoint_for_physical_phone(self):
        runner = Mock(side_effect=[
            subprocess.CompletedProcess([], 0, '0', ''),
            subprocess.CompletedProcess([], 0, 'packager-status:running', ''),
        ])
        metro.check_device(8090, 'fixture-phone', runner=runner)
        self.assertIn('localhost 8090', runner.call_args_list[-1].args[0][-1])


if __name__ == '__main__':
    unittest.main()
