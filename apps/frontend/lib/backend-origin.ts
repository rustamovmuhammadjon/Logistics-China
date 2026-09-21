export function backendOrigin() {
  let value = process.env.BACKEND_URL?.trim() ?? "";
  if (!value) {
    return { error: "BACKEND_URL is not set on Vercel. Add the Railway backend URL." };
  }

  value = value.replace(/\/$/, "").replace(/\/api$/i, "");
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { error: "BACKEND_URL is not a valid URL." };
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") {
    return { error: "BACKEND_URL is localhost. On Vercel it must be your Railway public URL, like https://xxxx.up.railway.app" };
  }
  if (host.endsWith(".vercel.app")) {
    return { error: "BACKEND_URL is the Vercel site. Put the Railway backend URL instead, like https://xxxx.up.railway.app" };
  }

  return { origin: url.origin };
}
