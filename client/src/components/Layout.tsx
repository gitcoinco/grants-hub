import React, { useEffect, useState } from "react";
import { shallowEqual, useSelector } from "react-redux";
import { RootState } from "../reducers";
import Landing from "./grants/Landing";
import Header from "./Header";
import Toast from "./base/Toast";
import Globe from "./icons/Globe";
import colors from "../styles/colors";

interface Props {
  children: JSX.Element;
}

function Layout(ownProps: Props) {
  const queryString = new URLSearchParams(window?.location?.search);
  // Twitter oauth will attach code & state in oauth procedure
  const queryError = queryString.get("error");
  const queryCode = queryString.get("code");
  const queryState = queryString.get("state");

  // if Twitter oauth then submit message to other windows and close self
  if (
    (queryError || queryCode) &&
    queryState &&
    /^twitter-.*/.test(queryState)
  ) {
    // shared message channel between windows (on the same domain)
    const channel = new BroadcastChannel("twitter_oauth_channel");
    // only continue with the process if a code is returned
    if (queryCode) {
      channel.postMessage({
        target: "twitter",
        data: { code: queryCode, state: queryState },
      });
    }
    // always close the redirected window
    window.close();

    return <div />;
  }
  // if Github oauth then submit message to other windows and close self
  if (
    (queryError || queryCode) &&
    queryState &&
    /^github-.*/.test(queryState)
  ) {
    // shared message channel between windows (on the same domain)
    const channel = new BroadcastChannel("github_oauth_channel");
    // only continue with the process if a code is returned
    if (queryCode) {
      channel.postMessage({
        target: "github",
        data: { code: queryCode, state: queryState },
      });
    }

    // always close the redirected window
    window.close();

    return <div />;
  }

  const [show, showToast] = useState(false);
  const props = useSelector(
    (state: RootState) => ({
      web3Initializing: state.web3.initializing,
      web3Initialized: state.web3.initialized,
      web3Error: state.web3.error,
      chainID: state.web3.chainID,
      account: state.web3.account,
    }),
    shallowEqual
  );

  useEffect(() => {
    showToast(props.web3Initialized);
  }, [props.web3Initialized]);

  const { children } = ownProps;
  if (!props.web3Initialized || props.account === undefined) {
    return <Landing />;
  }

  return (
    <div className="flex flex-col min-h-screen relative">
      <Header />
      <main className="container mx-auto dark:bg-primary-background grow">
        {!props.web3Error && props.web3Initialized && props.chainID && children}
        {props.web3Error && <p>{props.web3Error}</p>}
      </main>
      <Toast fadeOut show={show} onClose={() => showToast(false)}>
        <>
          <div className="w-6 mt-1 mr-2">
            <Globe color={colors["quaternary-text"]} />
          </div>
          <div>
            <p className="font-semibold text-quaternary-text">
              Wallet Connected!
            </p>
            <p className="text-quaternary-text">Welcome to your Grant Hub.</p>
          </div>
        </>
      </Toast>
      <div className="h-1/8">
        <div className="w-full flex justify-center py-4">
          <img
            alt="Built by the Gitcoin Community"
            src="./assets/footer-img.svg"
          />
        </div>
      </div>
    </div>
  );
}

export default Layout;
