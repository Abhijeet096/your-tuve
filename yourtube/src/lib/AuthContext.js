import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";
import { getlocation } from "./location";
import { applytheme, getdevice, themeforist } from "./theme";
import { toast } from "sonner";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [otpchallenge, setOtpchallenge] = useState(null);
  const [theme, setThemeState] = useState("dark");

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
    if (userdata?.theme) {
      setThemeState(userdata.theme);
      applytheme(userdata.theme);
    }
  };
  const logout = async () => {
    setUser(null);
    setOtpchallenge(null);
    localStorage.removeItem("user");
    const guesttheme = themeforist();
    setThemeState(guesttheme);
    applytheme(guesttheme);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const serverlogin = async (firebaseuser) => {
    const geo = await getlocation();
    const payload = {
      email: firebaseuser.email,
      name: firebaseuser.displayName,
      image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      ...geo,
      ...getdevice(),
    };
    const response = await axiosInstance.post("/user/login", payload);
    if (response.data.otpRequired) {
      setOtpchallenge({ ...response.data, city: geo.city, state: geo.state });
      return;
    }
    login(response.data.result);
  };

  const handlegooglesignin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  const verifyotp = async (otp) => {
    const res = await axiosInstance.post("/user/verify-otp", {
      userId: otpchallenge.userId,
      otp,
    });
    setOtpchallenge(null);
    login(res.data.result);
  };

  const resendotp = async () => {
    const res = await axiosInstance.post("/user/resend-otp", {
      userId: otpchallenge.userId,
    });
    setOtpchallenge((prev) => ({ ...prev, previewUrl: res.data.previewUrl }));
  };

  const setTheme = async (value) => {
    const next = value === "auto" ? themeforist() : value;
    setThemeState(next);
    applytheme(next);
    if (!user) return;
    try {
      const res = await axiosInstance.patch(`/user/theme/${user._id}`, { theme: value });
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    let initial = themeforist();
    try {
      const saved = JSON.parse(localStorage.getItem("user") || "null");
      if (saved?.theme) initial = saved.theme;
    } catch {}
    setThemeState(initial);
    applytheme(initial);
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        try {
          await serverlogin(firebaseuser);
        } catch (error) {
          console.error(error);
          if (error?.response?.data?.message) toast.error(error.response.data.message);
          logout();
        }
      }
    });
    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        otpchallenge,
        verifyotp,
        resendotp,
        cancelotp: logout,
        theme,
        setTheme,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
