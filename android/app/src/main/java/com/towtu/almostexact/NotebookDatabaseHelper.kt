package com.towtu.almostexact

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.DatabaseErrorHandler
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteException
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener

/** Only the module's single I/O worker accesses this helper. */
internal class NotebookDatabaseHelper(context: Context) :
    SQLiteOpenHelper(
        context,
        "calcnoir-notebook.db",
        null,
        1,
        // The platform's default corruption handler deletes files. Preserve them for recovery.
        DatabaseErrorHandler { database -> database.close() },
    ) {

  override fun onCreate(database: SQLiteDatabase) {
    database.execSQL(
        """
        CREATE TABLE notebook_pages (
          id TEXT NOT NULL PRIMARY KEY,
          created_at REAL NOT NULL,
          updated_at REAL,
          method TEXT NOT NULL,
          problem_json TEXT NOT NULL,
          title TEXT,
          notes TEXT,
          tags_json TEXT,
          pinned INTEGER CHECK (pinned IS NULL OR pinned IN (0, 1))
        )
        """.trimIndent(),
    )
    database.execSQL(
        """
        CREATE TABLE notebook_state (
          id INTEGER NOT NULL PRIMARY KEY CHECK (id = 1),
          initialized INTEGER NOT NULL CHECK (initialized = 1)
        )
        """.trimIndent(),
    )
  }

  override fun onUpgrade(database: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    throw SQLiteException("Notebook database version is unsupported.")
  }

  override fun onDowngrade(database: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    throw SQLiteException("Notebook database version is unsupported.")
  }

  fun readNotebook(): String? {
    val database = readableDatabase
    val initialized =
        database.query(
            "notebook_state",
            arrayOf("initialized"),
            "id = ?",
            arrayOf("1"),
            null,
            null,
            null,
        ).use { state -> state.moveToFirst() && state.getInt(0) == 1 }
    if (!initialized) {
      database.query(
          "notebook_pages",
          arrayOf("id"),
          null,
          null,
          null,
          null,
          null,
          "1",
      ).use { pages ->
        // Existing rows without their marker must never be overwritten by a legacy import.
        if (pages.moveToFirst()) {
          throw SQLiteException("Notebook state is unavailable.")
        }
      }
      return null
    }

    val entries = JSONArray()
    database.query(
        "notebook_pages",
        arrayOf(
            "id", "created_at", "updated_at", "problem_json", "title", "notes", "tags_json",
            "pinned",
        ),
        null,
        null,
        null,
        null,
        "created_at DESC, id ASC",
        // Include the overflow row so the JS decoder quarantines an over-cap database.
        "41",
    ).use { pages ->
      while (pages.moveToNext()) {
        val entry = JSONObject()
            .put("id", pages.getString(0))
            .put("createdAt", pages.getDouble(1))
            .put("problem", JSONObject(pages.getString(3)))
        if (!pages.isNull(2)) entry.put("updatedAt", pages.getDouble(2))
        pages.copyText(entry, "title", 4)
        pages.copyText(entry, "notes", 5)
        if (!pages.isNull(6)) entry.put("tags", JSONArray(pages.getString(6)))
        if (!pages.isNull(7)) {
          val pinned = pages.getInt(7)
          if (pinned != 0 && pinned != 1) {
            throw SQLiteException("Notebook metadata is unavailable.")
          }
          entry.put("pinned", pinned == 1)
        }
        entries.put(entry)
      }
    }
    return encodeNotebook(entries)
  }

  fun writeNotebook(serialized: String) {
    val pages = decodeWrite(serialized)
    val database = writableDatabase
    database.beginTransaction()
    try {
      database.delete("notebook_pages", null, null)
      for (page in pages) {
        database.insertOrThrow("notebook_pages", null, page)
      }
      val state = ContentValues().apply {
        put("id", 1)
        put("initialized", 1)
      }
      check(
          database.insertWithOnConflict(
              "notebook_state", null, state, SQLiteDatabase.CONFLICT_REPLACE,
          ) != -1L,
      )
      database.setTransactionSuccessful()
    } finally {
      database.endTransaction()
    }
  }

  private fun decodeWrite(serialized: String): List<ContentValues> {
    require(serialized.length <= 256000)
    val parser = JSONTokener(serialized)
    val envelope = parser.nextValue() as? JSONObject ?: invalidInput()
    require(parser.nextClean() == '\u0000')
    val version = envelope.opt("version")
    require(version is Number && version.toDouble() == 1.0)
    val entries = envelope.opt("entries") as? JSONArray ?: invalidInput()
    require(entries.length() <= 40)
    val identifiers = HashSet<String>()

    val normalizedEntries = JSONArray()
    val pages = List(entries.length()) { index ->
      val entry = entries.opt(index) as? JSONObject ?: invalidInput()
      val id = entry.opt("id") as? String ?: invalidInput()
      require(IDENTIFIER.matches(id) && identifiers.add(id))
      val problem = entry.opt("problem") as? JSONObject ?: invalidInput()
      val method = validateProblemShape(problem)
      val values = ContentValues().apply {
        put("id", id)
        put("created_at", timestamp(entry.opt("createdAt")))
        put("method", method)
        put("problem_json", problem.toString())
        if (entry.has("updatedAt")) {
          put("updated_at", timestamp(entry.opt("updatedAt")))
        }
        if (entry.has("title")) {
          put("title", boundedText(entry.opt("title"), 1, 80, trim = true))
        }
        if (entry.has("notes")) {
          put("notes", boundedText(entry.opt("notes"), 0, 4000))
        }
        if (entry.has("tags")) {
          val tags = entry.opt("tags") as? JSONArray ?: invalidInput()
          require(tags.length() <= 6)
          val uniqueTags = HashSet<String>()
          val normalizedTags = JSONArray()
          for (tagIndex in 0 until tags.length()) {
            val tag = boundedText(tags.opt(tagIndex), 1, 24, trim = true)
            require(uniqueTags.add(tag))
            normalizedTags.put(tag)
          }
          put("tags_json", normalizedTags.toString())
        }
        if (entry.has("pinned")) {
          val pinned = entry.opt("pinned") as? Boolean ?: invalidInput()
          put("pinned", if (pinned) 1 else 0)
        }
      }
      normalizedEntries.put(
          JSONObject()
              .put("id", id)
              .put("createdAt", values.getAsDouble("created_at"))
              .put("problem", problem)
              .apply {
                if (values.containsKey("updated_at")) put("updatedAt", values.get("updated_at"))
                if (values.containsKey("title")) put("title", values.get("title"))
                if (values.containsKey("notes")) put("notes", values.get("notes"))
                if (values.containsKey("tags_json")) {
                  put("tags", JSONArray(values.getAsString("tags_json")))
                }
                if (values.containsKey("pinned")) put("pinned", values.getAsInteger("pinned") == 1)
              },
      )
      values
    }
    // Re-encoding numbers must not make a successful write unreadable under the JS size cap.
    require(encodeNotebook(normalizedEntries).length <= 256000)
    return pages
  }

  /** Numerical validation stays in the shared JS domain; bound native storage's basic shape. */
  private fun validateProblemShape(problem: JSONObject): String {
    val method = problem.opt("method") as? String ?: invalidInput()
    when (problem.opt("kind")) {
      "root" -> {
        require(method in ROOT_METHODS)
        boundedText(problem.opt("expression"), 1, 300, trim = true)
        if (method == "fixed-point" || problem.has("gExpression")) {
          boundedText(
              problem.opt("gExpression"), if (method == "fixed-point") 1 else 0, 300,
              trim = true,
          )
        }
      }
      "interpolation" -> {
        require(method == "newton-divided" || method == "lagrange")
        val points = problem.opt("points") as? JSONArray ?: invalidInput()
        require(points.length() in 2..20)
        for (index in 0 until points.length()) {
          require(points.opt(index) is JSONObject)
        }
      }
      else -> invalidInput()
    }
    return method
  }

  private fun timestamp(value: Any?): Double {
    val number = (value as? Number)?.toDouble() ?: invalidInput()
    require(number.isFinite() && number >= 0 && number <= 8640000000000000.0)
    return number
  }

  private fun boundedText(value: Any?, min: Int, max: Int, trim: Boolean = false): String {
    val text = value as? String ?: invalidInput()
    val normalized = if (trim) text.trim() else text
    require(normalized.length in min..max)
    return normalized
  }

  private fun Cursor.copyText(entry: JSONObject, key: String, column: Int) {
    if (!isNull(column)) entry.put(key, getString(column))
  }

  private fun encodeNotebook(entries: JSONArray): String =
      JSONObject().put("version", 1).put("entries", entries).toString().replace("\\/", "/")

  private fun invalidInput(): Nothing = throw IllegalArgumentException("Invalid notebook.")

  private companion object {
    val IDENTIFIER = Regex("[a-zA-Z0-9-]{1,80}")
    val ROOT_METHODS = setOf("bisection", "newton", "secant", "fixed-point")
  }
}
