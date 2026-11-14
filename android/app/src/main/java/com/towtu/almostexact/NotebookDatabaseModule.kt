package com.towtu.almostexact

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import java.util.concurrent.Executors
import java.util.concurrent.RejectedExecutionException

@ReactModule(name = NotebookDatabaseModule.NAME)
class NotebookDatabaseModule(reactContext: ReactApplicationContext) :
    NativeNotebookDatabaseSpec(reactContext) {

  private val helper = NotebookDatabaseHelper(reactContext.applicationContext)
  private val executor = Executors.newSingleThreadExecutor { task ->
    Thread(task, "CalcNoirNotebookIO")
  }
  private val lifecycleLock = Any()
  private var invalidated = false

  override fun getName() = NAME

  override fun readNotebook(promise: Promise) {
    enqueue(promise, "E_NOTEBOOK_READ", "The notebook could not be read.") {
      helper.readNotebook()
    }
  }

  override fun writeNotebook(serialized: String, promise: Promise) {
    enqueue(promise, "E_NOTEBOOK_WRITE", "The notebook could not be saved.") {
      helper.writeNotebook(serialized)
      null
    }
  }

  private fun enqueue(promise: Promise, errorCode: String, message: String, operation: () -> Any?) {
    synchronized(lifecycleLock) {
      if (invalidated) {
        promise.reject("E_NOTEBOOK_UNAVAILABLE", "The notebook is not available.")
        return
      }
      try {
        executor.execute {
          val value = try {
            operation()
          } catch (_: Exception) {
            // Never forward SQL errors, file paths or notebook contents across the boundary.
            promise.reject(errorCode, message)
            return@execute
          }
          promise.resolve(value)
        }
      } catch (_: RejectedExecutionException) {
        promise.reject("E_NOTEBOOK_UNAVAILABLE", "The notebook is not available.")
      }
    }
  }

  override fun invalidate() {
    synchronized(lifecycleLock) {
      if (invalidated) return
      invalidated = true
      // A FIFO worker drains accepted writes before it closes the database.
      executor.execute { helper.close() }
      executor.shutdown()
    }
    super.invalidate()
  }

  companion object {
    const val NAME = "CalcNoirNotebookDatabase"
  }
}
