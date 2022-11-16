import { datadogRum } from "@datadog/browser-rum";
import { BigNumber, ethers } from "ethers";
import { Dispatch } from "redux";
import { addressesByChainID } from "../contracts/deployments";
import { global } from "../global";
import { RootState } from "../reducers";
import { AppStatus } from "../reducers/projects";
import PinataClient from "../services/pinata";
import { ProjectEventsMap } from "../types";
import { ChainId, graphqlFetch } from "../utils/graphql";
import { fetchGrantData } from "./grantsMetadata";

export const PROJECTS_LOADING = "PROJECTS_LOADING";
interface ProjectsLoadingAction {
  type: typeof PROJECTS_LOADING;
}

export const PROJECTS_LOADED = "PROJECTS_LOADED";
interface ProjectsLoadedAction {
  type: typeof PROJECTS_LOADED;
  events: ProjectEventsMap;
}

export const PROJECTS_ERROR = "PROJECTS_ERROR";
interface ProjectsErrorAction {
  type: typeof PROJECTS_ERROR;
  error: string;
}

export const PROJECTS_UNLOADED = "PROJECTS_UNLOADED";
export interface ProjectsUnloadedAction {
  type: typeof PROJECTS_UNLOADED;
}

export const PROJECT_APPLICATIONS_LOADING = "PROJECT_APPLICATIONS_LOADING";
interface ProjectApplicationsLoadingAction {
  type: typeof PROJECT_APPLICATIONS_LOADING;
}

export const PROJECT_APPLICATIONS_NOT_FOUND = "PROJECT_APPLICATIONS_NOT_FOUND";
interface ProjectApplicationsNotFoundAction {
  type: typeof PROJECT_APPLICATIONS_NOT_FOUND;
  projectID: string;
  roundID: string;
}

export const PROJECT_APPLICATIONS_LOADED = "PROJECT_APPLICATIONS_LOADED";
interface ProjectApplicationsLoadedAction {
  type: typeof PROJECT_APPLICATIONS_LOADED;
  projectID: string;
  applications: any;
}

export const PROJECT_APPLICATIONS_ERROR = "PROJECT_APPLICATIONS_ERROR";
interface ProjectApplicationsErrorAction {
  type: typeof PROJECT_APPLICATIONS_ERROR;
  projectID: string;
  error: string;
}

export const PROJECT_STATUS_LOADING = "PROJECT_STATUS_LOADING";
interface ProjectStatusLoadingAction {
  type: typeof PROJECT_STATUS_LOADING;
  projectID: string;
}

export const PROJECT_STATUS_LOADED = "PROJECT_STATUS_LOADED";
interface ProjectStatusLoadedAction {
  type: typeof PROJECT_STATUS_LOADED;
  roundID: string;
  applicationStatus: AppStatus;
}

export const PROJECT_STATUS_ERROR = "PROJECT_STATUS_ERROR";
interface ProjectStatusErrorAction {
  type: typeof PROJECT_STATUS_ERROR;
  projectID: string;
  error: string;
}

export type ProjectsActions =
  | ProjectsLoadingAction
  | ProjectsLoadedAction
  | ProjectsErrorAction
  | ProjectsUnloadedAction
  | ProjectApplicationsLoadingAction
  | ProjectApplicationsNotFoundAction
  | ProjectApplicationsLoadedAction
  | ProjectApplicationsErrorAction
  | ProjectStatusLoadingAction
  | ProjectStatusLoadedAction
  | ProjectStatusErrorAction;

const projectsLoading = () => ({
  type: PROJECTS_LOADING,
});

const projectsLoaded = (events: ProjectEventsMap) => ({
  type: PROJECTS_LOADED,
  events,
});

const projectError = (error: string) => ({
  type: PROJECTS_ERROR,
  error,
});

const projectsUnload = () => ({
  type: PROJECTS_UNLOADED,
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const projectStatusLoading = (projectID: string) => ({
  type: PROJECT_STATUS_LOADING,
  projectID,
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const projectStatusLoaded = (roundID: string, appStatus: AppStatus) => ({
  type: PROJECT_STATUS_LOADED,
  roundID,
  applicationStatus: appStatus,
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const projectStatusError = (projectID: string, error: any) => ({
  type: PROJECT_STATUS_ERROR,
  projectID,
  error,
});

const fetchProjectCreatedEvents = async (chainID: number, account: string) => {
  const addresses = addressesByChainID(chainID!);
  // FIXME: use contract filters when fantom bug is fixed
  // const contract = new ethers.Contract(
  //   addresses.projectRegistry,
  //   ProjectRegistryABI,
  //   global.web3Provider!
  // );

  // FIXME: use this line when the fantom RPC bug has been fixed
  // const createdFilter = contract.filters.ProjectCreated(null, account) as any;
  const createdEventSig = ethers.utils.id("ProjectCreated(uint256,address)");
  const createdFilter = {
    address: addresses.projectRegistry,
    fromBlock: "0x00",
    toBlock: "latest",
    topics: [createdEventSig, null, ethers.utils.hexZeroPad(account, 32)],
  };

  // FIXME: remove when the fantom RPC bug has been fixed
  if (chainID === 250 || chainID === 4002) {
    createdFilter.address = undefined;
  }

  // FIXME: use queryFilter when the fantom RPC bug has been fixed
  // const createdEvents = await contract.queryFilter(createdFilter);
  let createdEvents = await global.web3Provider!.getLogs(createdFilter);

  // FIXME: remove when the fantom RPC bug has been fixed
  createdEvents = createdEvents.filter(
    (e) => e.address === addresses.projectRegistry
  );

  if (createdEvents.length === 0) {
    return {
      createdEvents: [],
      updatedEvents: [],
      ids: [],
    };
  }

  // FIXME: use this line when the fantom RPC bug has been fixed
  // const ids = createdEvents.map((event) => event.args!.projectID!.toNumber());
  const ids = createdEvents.map((event) => parseInt(event.topics[1], 16));

  // FIXME: use this line when the fantom RPC bug has been fixed
  // const hexIDs = createdEvents.map((event) =>
  //   event.args!.projectID!.toHexString()
  // );
  const hexIDs = createdEvents.map((event) => event.topics[1]);

  // FIXME: use this after fantom bug is fixed
  // const updatedFilter = contract.filters.MetadataUpdated(hexIDs);
  // const updatedEvents = await contract.queryFilter(updatedFilter);

  // FIXME: remove when fantom bug is fixed
  const updatedEventSig = ethers.utils.id(
    "MetadataUpdated(uint256,(uint256,string))"
  );
  const updatedFilter = {
    address: addresses.projectRegistry,
    fromBlock: "0x00",
    toBlock: "latest",
    topics: [updatedEventSig, hexIDs],
  };

  // FIXME: remove when the fantom RPC bug has been fixed
  if (chainID === 250 || chainID === 4002) {
    updatedFilter.address = undefined;
  }

  let updatedEvents = await global.web3Provider!.getLogs(updatedFilter);
  // FIXME: remove when the fantom RPC bug has been fixed
  updatedEvents = updatedEvents.filter(
    (e) => e.address === addresses.projectRegistry
  );

  return {
    createdEvents,
    updatedEvents,
    ids,
  };
};

export const updateApplicationStatusFromContract = async (
  project: any,
  roundId: string,
  dispatch: Dispatch
) => {
  dispatch(projectStatusLoading(project.id));
  // handle when operator has not reviewed the application yet
  if (!project.round.projectsMetaPtr.pointer) {
    dispatch(projectStatusLoaded(project.round.id, AppStatus.InReview));
  }

  try {
    const ipfsClient = new PinataClient();
    const statusData = await ipfsClient.fetchJson(
      project.round.projectsMetaPtr.pointer
    );

    statusData.forEach((projectStatus: any) => {
      // using index 0 to get the latest one, not confirmed yet that this is the correct way
      if (project.id === projectStatus.id) {
        dispatch(
          projectStatusLoaded(roundId, statusData[0].status as AppStatus)
        );
      }
    });
  } catch (error) {
    datadogRum.addError(error, { projectID: project.id });
    dispatch(projectStatusError(project.id, error));
  }
};

export const getApplicationsByRoundId =
  (roundId: string, chainId: any) => async (dispatch: Dispatch) => {
    try {
      // query the subgraph for all rounds by the given account in the given program
      const res = await graphqlFetch(
        `
          query GetApplicationsByRoundId($roundId: String!, $status: String) {
            roundProjects(where: {
              round: $roundId
        ` +
          // TODO : uncomment when indexing IPFS via graph
          // (status ? `status: $status` : ``)
          // +
          `
            }) {
              id
              metaPtr {
                protocol
                pointer
              }
              status
              round {
                projectsMetaPtr {
                  protocol
                  pointer
                }
              }
            }
          }
        `,
        chainId,
        { roundId }
      );

      if (res.data.roundProjects.length > 0) {
        // eslint-disable-next-line
        res.data.roundProjects.map((project: any) => {
          try {
            updateApplicationStatusFromContract(project, roundId, dispatch);
          } catch (error) {
            datadogRum.addError(error, { projectID: project.id });
            dispatch(projectStatusError(project.id, error));
          }
        });
      }
    } catch (error) {
      datadogRum.addError(error, { roundId });
      console.error("getApplicationsByRoundId() error", error);
    }
  };

export const loadProjects =
  (withMetaData?: boolean) =>
  async (dispatch: Dispatch, getState: () => RootState) => {
    dispatch(projectsLoading());

    const state = getState();
    const { chainID, account } = state.web3;

    try {
      const { createdEvents, updatedEvents, ids } =
        await fetchProjectCreatedEvents(chainID!, account!);

      if (createdEvents.length === 0) {
        dispatch(projectsLoaded({}));
        return;
      }

      const events: ProjectEventsMap = {};

      createdEvents.forEach((createEvent) => {
        // FIXME: use this line when the fantom RPC bug has been fixed
        // const id = createEvent.args!.projectID!;
        const id = parseInt(createEvent.topics[1], 16);
        events[id] = {
          createdAtBlock: createEvent.blockNumber,
          updatedAtBlock: undefined,
        };
      });

      updatedEvents.forEach((updateEvent) => {
        // FIXME: use this line when the fantom RPC bug has been fixed
        // const id = BigNumber.from(updateEvent.args!.projectID!).toNumber();
        const id = BigNumber.from(updateEvent.topics[1]).toNumber();
        const event = events[id];
        if (event !== undefined) {
          event.updatedAtBlock = updateEvent.blockNumber;
        }
      });

      if (withMetaData) {
        ids.map((id) => dispatch<any>(fetchGrantData(id)));
      }

      dispatch(projectsLoaded(events));
    } catch (error) {
      dispatch(projectError("Cannot load projects"));
    }
  };

export const getRoundProjectsApplied =
  (projectID: string, chainId: ChainId) => async (dispatch: Dispatch) => {
    dispatch({
      type: PROJECT_APPLICATIONS_LOADING,
      projectID,
    });

    try {
      const applicationsFound: any = await graphqlFetch(
        `query roundProjects($projectID: String) {
          roundProjects(where: { project: $projectID }) {
            status
            round {
              id
            }
          }
        }
        `,
        chainId,
        { projectID }
      );
      const applications = applicationsFound.data.roundProjects;

      dispatch({
        type: PROJECT_APPLICATIONS_LOADED,
        projectID,
        applications,
      });
    } catch (error: any) {
      datadogRum.addError(error, { projectID });
      dispatch({
        type: PROJECT_APPLICATIONS_ERROR,
        projectID,
        error: error.message,
      });
    }
  };

export const unloadProjects = () => projectsUnload();
