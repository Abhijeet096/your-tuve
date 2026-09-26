# YourTube

A YouTube clone built with Next.js, Express, MongoDB and Socket.IO.

**Live:** https://your-tuve.vercel.app

Frontend is on Vercel, backend on Render, database on MongoDB Atlas, and video files on Cloudinary.

## Features

**Basics (training project)**
- Google sign-in (Firebase), channels, video upload
- Likes, watch later, history, search, comments

**Internship tasks**

1. **Watch party**: invite friends with a link and watch together with synced play/pause/seek. Includes a video call, chat, screen sharing, mute / camera / leave controls, a participant list, and local recording.
2. **Controlled downloads**: free users get 1 download a day, and paid plans get more (Bronze 3, Silver 7, Gold 20). Every download is saved with the date, plan and video, and listed on the Downloads page.
3. **Subscription plans**: Free / Bronze / Silver / Gold, paid through Razorpay (test mode). After payment the plan is updated and an invoice email is sent. Free users get a 60-second preview per video and see ads. Silver and Gold are ad-free.
4. **Custom video player**: play/pause, volume, fullscreen, ±10s seek (buttons and arrow keys), double-tap left/right on mobile, current time / duration, a loading spinner and an up-next screen.
5. **Theme and login security**: logging in between 10 AM and 12 PM IST gives the light theme, and any other time gives dark. The theme is saved to the profile and can be changed from the header. A login from a new city, state or device needs an email OTP.
6. **Comments**: comment in any language and translate to your preferred one. The city is shown only if you opt in. Abusive words, spam, repeated special characters and duplicate comments are blocked. Like, dislike and report comments. Reported comments are flagged for review on `/review` instead of being deleted.

## Running locally

```bash
# backend
cd server
npm install
npm start

# frontend
cd yourtube
npm install
npm run dev
```

### server/.env

```
PORT=5000
DB_URL=mongodb+srv://...
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
BREVO_API_KEY=
MAIL_FROM=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Emails (OTP and invoices) go through Brevo's HTTPS API when `BREVO_API_KEY` is set, since Render's free plan blocks SMTP. `MAIL_FROM` must be a sender verified in Brevo. Without Brevo it falls back to SMTP, and without SMTP settings emails go to an Ethereal test inbox, with the preview link printed in the console. Without Cloudinary settings, videos are saved in `server/uploads`.

### yourtube/.env.local

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
# optional, for watch party calls between different networks
NEXT_PUBLIC_TURN_URLS=
NEXT_PUBLIC_TURN_USERNAME=
NEXT_PUBLIC_TURN_CREDENTIAL=
```

## Test payments

Razorpay is in test mode, so no real money is charged. Pay with the UPI ID `success@razorpay`, or any test card from Razorpay's docs.
