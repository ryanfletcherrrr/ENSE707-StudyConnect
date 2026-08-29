// Data-access layer for study groups.
// Raw SQL stays here so controllers remain focused on request handling.

export function findGroupsByCourse(db, course) {
    return db
      .prepare(`
        SELECT
          study_groups.id,
          study_groups.group_name,
          study_groups.course,
          study_groups.description,
          study_groups.created_by,
          study_groups.created_at
        FROM study_groups
        WHERE LOWER(study_groups.course) = LOWER(?)
        ORDER BY study_groups.created_at DESC
      `)
      .all(course.trim());
  }