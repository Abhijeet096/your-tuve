import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var u=JSON.parse(localStorage.getItem("user")||"null");var t=u&&u.theme;if(!t){var d=new Date(Date.now()+330*60000);var m=d.getUTCHours()*60+d.getUTCMinutes();t=m>=600&&m<720?"light":"dark";}if(t==="dark")document.documentElement.classList.add("dark");document.documentElement.style.colorScheme=t;}catch(e){}})();`,
          }}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
