import type { SessionUser } from "../platform/types";

export function matchesCohort(
  student: SessionUser,
  query: string,
  department: string,
  section: string,
) {
  return (
    (!department || student.department === department) &&
    (!section || student.section === section) &&
    [student.name, student.email, student.rollNumber, student.contactNumber]
      .join(" ")
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );
}

export function CohortFilters({
  department,
  section,
  onDepartment,
  onSection,
}: {
  department: string;
  section: string;
  onDepartment: (value: string) => void;
  onSection: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className="text-xs text-[var(--muted)]">
        Department
        <select
          className="profile-select"
          value={department}
          onChange={(event) => onDepartment(event.target.value)}
        >
          <option value="">All departments</option>
          {["CSE", "CSM", "CSD"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-[var(--muted)]">
        Section
        <select
          className="profile-select"
          value={section}
          onChange={(event) => onSection(event.target.value)}
        >
          <option value="">All sections</option>
          {["A", "B", "C", "D", "E"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
