import { useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { loadProjects } from "../../actions/projects";
import { loadRound, unloadRounds } from "../../actions/rounds";
import useLocalStorage from "../../hooks/useLocalStorage";
import { RootState } from "../../reducers";
import { Status as ProjectStatus } from "../../reducers/projects";
import { ApplicationModalStatus } from "../../reducers/roundApplication";
import { Status } from "../../reducers/rounds";
import { grantsPath, newGrantPath, roundApplicationPath } from "../../routes";
import { formatDate } from "../../utils/components";
import { networkPrettyName } from "../../utils/wallet";
import Button, { ButtonVariants } from "../base/Button";

function Round() {
  const [roundData, setRoundData] = useState<any>();

  const params = useParams();
  const dispatch = useDispatch();

  const { roundId, chainId } = params;

  const props = useSelector((state: RootState) => {
    const allProjectMetadata = state.grantsMetadata;
    const projectsStatus = state.projects.status;
    const roundState = state.rounds[roundId!];
    const status = roundState ? roundState.status : Status.Undefined;
    const error = roundState ? roundState.error : undefined;
    const round = roundState ? roundState.round : undefined;
    const web3ChainId = state.web3.chainID;
    const roundChainId = Number(chainId);

    const now = Math.trunc(Date.now() / 1000);
    const applicationEnded = roundState
      ? (roundState.round?.applicationsEndTime || now - 1000) < now
      : true;

    return {
      roundState,
      status,
      error,
      round,
      web3ChainId,
      roundChainId,
      projects: allProjectMetadata,
      projectsStatus,
      applicationEnded,
    };
  }, shallowEqual);

  const renderApplicationDate = () => (
    <>
      {formatDate(roundData?.applicationsStartTime)} -{" "}
      {formatDate(roundData?.applicationsEndTime)}
    </>
  );

  const renderRoundDate = () => (
    <>
      {formatDate(roundData?.roundStartTime)} -{" "}
      {formatDate(roundData?.roundEndTime)}
    </>
  );

  const [, setRoundToApply] = useLocalStorage("roundToApply", null);
  const [roundApplicationModal, setToggleRoundApplicationModal] =
    useLocalStorage(
      "toggleRoundApplicationModal",
      ApplicationModalStatus.Undefined
    );

  useEffect(() => {
    if (
      roundId &&
      props.applicationEnded !== undefined &&
      !props.applicationEnded
    ) {
      setRoundToApply(`${chainId}:${roundId}`);

      if (roundApplicationModal === ApplicationModalStatus.Undefined) {
        setToggleRoundApplicationModal(ApplicationModalStatus.NotApplied);
      }
    }
  }, [roundId, props.applicationEnded]);

  useEffect(() => {
    if (roundId !== undefined) {
      dispatch(unloadRounds());
      dispatch(loadRound(roundId));
    }
  }, [dispatch, roundId]);

  useEffect(() => {
    if (props.round) {
      setRoundData(props.round);
    }
  }, [props.round]);

  useEffect(() => {
    if (props.projectsStatus === ProjectStatus.Undefined) {
      dispatch(loadProjects(true));
    }
  }, [props.projectsStatus, dispatch]);

  if (props.web3ChainId !== props.roundChainId) {
    return (
      <p>
        This application has been deployed to{" "}
        {networkPrettyName(props.roundChainId)} and you are connected to{" "}
        {networkPrettyName(props.web3ChainId ?? 1)}
      </p>
    );
  }

  if (props.status === Status.Error) {
    return <p>Error: {props.error}</p>;
  }

  if (
    props.status !== Status.Loaded ||
    props.projectsStatus !== ProjectStatus.Loaded
  ) {
    return <p>loading...</p>;
  }

  if (props.roundState === undefined || props.round === undefined) {
    return <p>something went wrong</p>;
  }

  return (
    <div className="h-full w-full absolute flex flex-col justify-center items-center">
      <div className="w-full lg:w-1/3 sm:w-2/3">
        <h2 className="text-center uppercase text-2xl">
          {roundData?.programName}
        </h2>
        <h2 className="text-center">{roundData?.roundMetadata.name}</h2>
        <h4 className="text-center">{roundData?.roundMetadata.description}</h4>
        {props.applicationEnded ? (
          <>
            <div className="flex flex-col my-8 text-secondary-text">
              {/* <div className="text-xl flex flex-1 flex-col mt-12">
                <span>Matching Funds Available:</span>
                <span>$XXX,XXX</span>
              </div> */}
              <div className="text-xl flex flex-1 flex-col mt-12">
                <span>Application Date:</span>
                <span>{renderApplicationDate()}</span>
              </div>
              <div className="text-xl flex flex-1 flex-col mt-12">
                <span>Round Date:</span>
                <span>{renderRoundDate()}</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col mt-28">
              <Button
                styles={[
                  "w-full justify-center bg-gitcoin-grey-300 border-0 font-medium text-white py-4 shadow-gitcoin-sm opacity-100",
                ]}
                variant={ButtonVariants.primary}
                disabled
              >
                Application Ended
              </Button>

              <div className="text-center flex flex-1 flex-col mt-6 text-secondary-text">
                <span>The application period for this round has ended.</span>
                <span>
                  If you&apos;ve applied to this round, view your projects on{" "}
                  <Link to={grantsPath()} className="text-gitcoin-violet-400">
                    My Projects.
                  </Link>
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 flex flex-col">
            <p className="mt-4 mb-12 w-full text-center">
              Date: {renderApplicationDate()}
            </p>
            {Object.keys(props.projects).length !== 0 ? (
              <Link to={roundApplicationPath(chainId!, roundId!)}>
                <Button
                  styles={["w-full justify-center"]}
                  variant={ButtonVariants.primary}
                >
                  Apply to this round
                </Button>
              </Link>
            ) : (
              <Link to={newGrantPath()}>
                <Button
                  styles={["w-full justify-center"]}
                  variant={ButtonVariants.primary}
                >
                  Create Project
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Round;
