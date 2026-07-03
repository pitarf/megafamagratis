import { loginAdminHandler } from "./src/services/admin-server.server";

async function main() {
  try {
    const res = await loginAdminHandler("@212121@");
    console.log("Response:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
