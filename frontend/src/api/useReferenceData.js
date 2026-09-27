import { useEffect, useState } from "react";
import client from "./client";

export default function useReferenceData() {
  const [departments, setDepartments] = useState([]);
  const [levels, setLevels] = useState([]);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    client.get("/core/departments/").then((r) => setDepartments(r.data));
    client.get("/core/levels/").then((r) => setLevels(r.data));
    client.get("/core/activities/").then((r) => setActivities(r.data));
  }, []);

  return {
    departments: departments.map((d) => ({ value: d.id, label: d.name })),
    levels: levels.map((l) => ({ value: l.id, label: l.name })),
    activities: activities.map((a) => ({ value: a.id, label: a.name })),
    departmentsRaw: departments,
    levelsRaw: levels,
    activitiesRaw: activities,
  };
}
