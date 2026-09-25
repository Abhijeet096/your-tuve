let pending = null;

export const getlocation = async () => {
  try {
    const cached = sessionStorage.getItem("geo");
    if (cached) return JSON.parse(cached);
  } catch {}
  if (!pending) {
    pending = fetch("https://get.geojs.io/v1/ip/geo.json")
      .then((res) => res.json())
      .then((data) => {
        const geo = {
          city: data.city || "",
          state: data.region || "",
          country: data.country || "",
        };
        try {
          sessionStorage.setItem("geo", JSON.stringify(geo));
        } catch {}
        return geo;
      })
      .catch(() => ({ city: "", state: "", country: "" }))
      .finally(() => {
        pending = null;
      });
  }
  return pending;
};
