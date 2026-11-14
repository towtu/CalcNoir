import java.io.InputStream;
import java.security.CodeSigner;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;

/** Verify complete JAR payload coverage, allowing self-signed test identities. */
public final class VerifySignedJar {
  private static boolean signingMetadata(String name) {
    String upper = name.toUpperCase(Locale.ROOT);
    if (!upper.startsWith("META-INF/")) return false;
    String relative = upper.substring("META-INF/".length());
    return !relative.contains("/") && (relative.equals("MANIFEST.MF")
        || relative.matches("[^/]+\\.(SF|RSA|DSA|EC)") || relative.startsWith("SIG-"));
  }

  public static void main(String[] args) throws Exception {
    if (args.length != 2 || !args[1].matches("[a-fA-F0-9]{64}")) {
      throw new IllegalArgumentException("Expected archive path and leaf-certificate SHA-256.");
    }
    int payloadCount = 0;
    Set<String> names = new HashSet<>();
    byte[] buffer = new byte[65536];
    try (JarFile archive = new JarFile(args[0], true)) {
      var entries = archive.entries();
      while (entries.hasMoreElements()) {
        JarEntry entry = entries.nextElement();
        if (!names.add(entry.getName())) throw new SecurityException("Duplicate JAR entry.");
        if (entry.isDirectory()) continue;
        // JarFile verifies digests while reading, and attaches signers only afterwards.
        try (InputStream input = archive.getInputStream(entry)) {
          while (input.read(buffer) != -1) { /* Stream without retaining payload bytes. */ }
        }
        if (signingMetadata(entry.getName())) continue;
        CodeSigner[] signers = entry.getCodeSigners();
        if (signers == null || signers.length != 1) {
          throw new SecurityException("Unsigned or multiply signed JAR payload: " + entry.getName());
        }
        byte[] leaf = signers[0].getSignerCertPath().getCertificates().get(0).getEncoded();
        String fingerprint = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(leaf));
        if (!fingerprint.equalsIgnoreCase(args[1])) {
          throw new SecurityException("JAR payload uses a different signing identity.");
        }
        payloadCount++;
      }
    }
    if (payloadCount == 0) throw new SecurityException("JAR contains no signed payload.");
    System.out.println("All " + payloadCount + " JAR payload entries are signed by the expected identity.");
  }
}
