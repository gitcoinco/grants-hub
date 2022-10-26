import { Badge, Box, SimpleGrid } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadRound, unloadRounds } from "../../actions/rounds";
import { RootState } from "../../reducers";
import { formatDate } from "../../utils/components";

// type ApplicationCardProps = {
//   projectID: string;
//   chainId: number;
//   applications: any;
// };

export default function ApplicationCard({
  applicationData,
}: {
  applicationData: any;
}) {
  const [roundData, setRoundData] = useState<any>();
  const dispatch = useDispatch();
  const props = useSelector((state: RootState) => {
    const roundState = state.rounds[applicationData.roundID];
    const round = roundState ? roundState.round : undefined;

    return {
      round,
    };
  });

  // const renderRoundDate = () => (
  //   <>
  //     {formatDate(roundData?.roundStartTime)} -{" "}
  //     {formatDate(roundData?.roundEndTime)}
  //   </>
  // );

  const renderApplicationDate = () => (
    <>
      {formatDate(roundData?.applicationsStartTime)} -{" "}
      {formatDate(roundData?.applicationsEndTime)}
    </>
  );

  useEffect(() => {
    if (applicationData.roundID !== undefined) {
      dispatch(unloadRounds());
      dispatch(loadRound(applicationData.roundID));
    }
  }, [dispatch, applicationData.roundID]);

  useEffect(() => {
    if (props.round) {
      setRoundData(props.round);
    }
  }, [props.round]);

  console.log("AppCard props", applicationData, props, roundData);

  return (
    <Box p={2} className="border-gray-300" borderWidth="1px" borderRadius="md">
      <Box p={2} mb={4}>
        <span className="text-[16px] text-gitcoin-gray-400">
          {props.round?.roundMetadata.name}
        </span>
      </Box>
      <SimpleGrid columns={2} spacing={2}>
        <Box className="pl-2 text-gitcoin-gray-400">
          <span>{props.round?.programName}</span>
        </Box>
        <Box className="pl-2 text-right text-gitcoin-gray-400">
          <Badge className="bg-gitcoin-gray-100" borderRadius="full" p={2}>
            {applicationData.application.status}
          </Badge>
        </Box>
      </SimpleGrid>
      <Box className="pl-2 text-gitcoin-gray-400">
        <span>{renderApplicationDate()}</span>
      </Box>
      <Box p={2} className="mt-4 mb-6">
        <p>
          Have any questions about your grant round application? Contact{" "}
          <a className="text-purple-500" href="/">
            [Program Support]
          </a>
        </p>
      </Box>
    </Box>
  );
}