import axios from "axios";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true" || true;
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api",
  timeout: 10000,
});
export { USE_MOCK };
export default client;
