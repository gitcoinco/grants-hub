import { Dispatch } from "redux";
import { ethers } from "ethers";
import { Status } from "../reducers/roundApplication";
import { RootState } from "../reducers";
import RoundApplicationBuilder from "../utils/RoundApplicationBuilder";
import { Metadata, Project } from "../types";
import PinataClient from "../services/pinata";
import RoundABI from "../contracts/abis/Round.json";
import { global } from "../global";

export const ROUND_APPLICATION_LOADING = "ROUND_APPLICATION_LOADING";
interface RoundApplicationLoadingAction {
  type: typeof ROUND_APPLICATION_LOADING;
  roundAddress: string;
  status: Status;
}

export const ROUND_APPLICATION_ERROR = "ROUND_APPLICATION_ERROR";
interface RoundApplicationErrorAction {
  type: typeof ROUND_APPLICATION_ERROR;
  roundAddress: string;
  error: string;
}

export const ROUND_APPLICATION_LOADED = "ROUND_APPLICATION_LOADED";
interface RoundApplicationLoadedAction {
  type: typeof ROUND_APPLICATION_LOADED;
  roundAddress: string;
}

export type RoundApplicationActions =
  | RoundApplicationLoadingAction
  | RoundApplicationErrorAction
  | RoundApplicationLoadedAction;

const applicationError = (
  roundAddress: string,
  error: string
): RoundApplicationActions => ({
  type: ROUND_APPLICATION_ERROR,
  roundAddress,
  error,
});

export const submitApplication =
  (roundAddress: string, formInputs: { [id: number]: string }) =>
  async (dispatch: Dispatch, getState: () => RootState) => {
    dispatch({
      type: ROUND_APPLICATION_LOADING,
      roundAddress,
      status: Status.BuildingApplication,
    });

    const state = getState();
    const roundState = state.rounds[roundAddress];
    if (roundState === undefined) {
      dispatch(applicationError(roundAddress, "cannot load round data"));
      return;
    }

    const roundApplicationMetadata = roundState.round?.applicationMetadata;
    if (roundApplicationMetadata === undefined) {
      dispatch(
        applicationError(roundAddress, "cannot load round application metadata")
      );
      return;
    }

    const { projectQuestionId } = roundApplicationMetadata;
    if (projectQuestionId === undefined) {
      dispatch(
        applicationError(roundAddress, "cannot find project question id")
      );
      return;
    }

    const projectId = formInputs[projectQuestionId];
    const projectMetadata: Metadata | undefined =
      state.grantsMetadata[Number(projectId)].metadata;
    if (projectMetadata === undefined) {
      dispatch(
        applicationError(roundAddress, "cannot find selected project metadata")
      );
      return;
    }

    const project: Project = {
      lastUpdated: 0,
      id: projectId,
      title: projectMetadata.title,
      description: projectMetadata.description,
      website: projectMetadata.website,
      bannerImg: projectMetadata.bannerImg!,
      logoImg: projectMetadata.logoImg!,
      metaPtr: {
        protocol: String(projectMetadata.protocol),
        pointer: projectMetadata.pointer,
      },
    };

    const builder = new RoundApplicationBuilder(
      project,
      roundApplicationMetadata
    );
    const application = builder.build(roundAddress, formInputs);

    const pinataClient = new PinataClient();

    dispatch({
      type: ROUND_APPLICATION_LOADING,
      roundAddress,
      status: Status.UploadingMetadata,
    });
    const resp = await pinataClient.pinJSON(application);
    const metaPtr = {
      protocol: "1",
      pointer: resp.IpfsHash,
    };

    dispatch({
      type: ROUND_APPLICATION_LOADING,
      roundAddress,
      status: Status.SendingTx,
    });

    const signer = global.web3Provider!.getSigner();
    const contract = new ethers.Contract(roundAddress, RoundABI, signer);
    // FIXME: when the new round implementation is deployed we can send a
    // bytes32 instead of an address
    const projectUniqueID = "0x000000000000000000000000000000000000beaf";
    try {
      await contract.applyToRound(projectUniqueID, metaPtr);
      dispatch({
        type: ROUND_APPLICATION_LOADED,
        roundAddress,
      });
    } catch (e) {
      console.error("error calling applyToRound:", e);
      dispatch({
        type: ROUND_APPLICATION_ERROR,
        roundAddress,
        error: "error calling applyToRound",
      });
    }
  };