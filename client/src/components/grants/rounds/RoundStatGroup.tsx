import { useSelector } from "react-redux";
import { RootState } from "../../../reducers";
import { Application } from "../../../reducers/projects";
import { RoundDisplayType } from "../../../types";
import RoundListItem from "./RoundListItem";

export default function RoundStatGroup({
  projectId,
  applicationData,
  displayType,
}: {
  projectId: string;
  applicationData?: Application[];
  displayType: RoundDisplayType;
}) {
  let roundStatHeader: JSX.Element | undefined;
  const props = useSelector((state: RootState) => {
    const roundIds = applicationData?.map((round) => round.roundID);
    const applications = state.projects.applications[projectId] || [];
    const { rounds } = state;

    return {
      state,
      rounds,
      roundIds,
      applications,
    };
  });

  console.log("JER stat group props", { props });

  const renderRoundStatHeader = () => {
    switch (displayType) {
      case RoundDisplayType.Active:
        roundStatHeader = (
          <span className="text-gitcoin-grey-500 text-[12px] font-semibold">
            Active Rounds
          </span>
        );
        break;
      case RoundDisplayType.Current:
        roundStatHeader = (
          <span className="text-gitcoin-grey-500 text-[12px] font-semibold">
            Current Applications
          </span>
        );
        break;
      case RoundDisplayType.Past:
        roundStatHeader = (
          <span className="text-gitcoin-grey-500 text-[12px] font-semibold">
            Past Rounds
          </span>
        );
        break;
      default:
        break;
    }
  };

  if (displayType) {
    renderRoundStatHeader();
  }

  return (
    <div className="flex-1">
      {roundStatHeader ?? null}
      {/* loop over the round applications */}
      {props.applications.map((app) => (
        <RoundListItem applicationData={app} displayType={displayType} />
      ))}
    </div>
  );
}
