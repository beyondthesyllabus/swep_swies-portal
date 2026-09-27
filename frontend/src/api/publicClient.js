import axios from "axios";

const publicClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
});

publicClient.interceptors.request.use((config) => {
  const studentToken = sessionStorage.getItem("swep_student_session");
  if (studentToken) config.headers["X-Student-Session"] = studentToken;
  return config;
});

export default publicClient;
