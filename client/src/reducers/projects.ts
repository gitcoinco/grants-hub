import {
  ProjectsActions,
  PROJECTS_ERROR,
  PROJECTS_LOADED,
  PROJECTS_LOADING,
  PROJECTS_UNLOADED,
  PROJECT_APPLICATIONS_ERROR,
  PROJECT_APPLICATIONS_LOADED,
  PROJECT_APPLICATIONS_LOADING,
  PROJECT_APPLICATIONS_NOT_FOUND,
  PROJECT_STATUS_ERROR,
  PROJECT_STATUS_LOADED,
  PROJECT_STATUS_LOADING,
} from "../actions/projects";
import { ProjectEventsMap } from "../types";

export enum Status {
  Undefined = 0,
  Loading,
  Loaded,
  Error,
}

export enum AppStatus {
  Approved = "APPROVED",
  Rejected = "REJECTED",
  Pending = "PENDING",
  NotFound = "NOT_FOUND",
  Unknown = "UNKNOWN",
}

export type Application = {
  round: {
    id: string;
  };
  applicationStatus: AppStatus;
};

export interface ProjectsState {
  status: Status;
  error: string | undefined;
  ids: number[];
  events: ProjectEventsMap;
  applications: Application[];
  applicationsLoadingStatus: Status;
}

const initialState: ProjectsState = {
  status: Status.Undefined,
  error: undefined,
  ids: [],
  events: {},
  applications: [],
  applicationsLoadingStatus: Status.Undefined,
};

export const projectsReducer = (
  state: ProjectsState = initialState,
  action: ProjectsActions
): ProjectsState => {
  switch (action.type) {
    case PROJECTS_LOADING: {
      return {
        ...state,
        status: Status.Loading,
        ids: [],
      };
    }

    case PROJECTS_LOADED: {
      const { events } = action;
      const ids = Object.keys(events).map((id) => Number(id));

      return {
        ...state,
        status: Status.Loaded,
        ids,
        events,
      };
    }

    case PROJECTS_ERROR: {
      return {
        ...state,
        status: Status.Error,
        error: action.error,
      };
    }

    case PROJECTS_UNLOADED: {
      return {
        ...state,
        status: Status.Undefined,
        ids: [],
        events: {},
      };
    }

    case PROJECT_APPLICATIONS_LOADING: {
      return {
        ...state,
        applications: [],
        error: undefined,
        applicationsLoadingStatus: Status.Loading,
      };
    }

    case PROJECT_APPLICATIONS_NOT_FOUND: {
      const { roundID } = action;
      return {
        ...state,
        applications: [
          {
            round: {
              id: roundID,
            },
            applicationStatus: AppStatus.NotFound,
          },
        ],
        error: undefined,
        applicationsLoadingStatus: Status.Loaded,
      };
    }

    case PROJECT_APPLICATIONS_LOADED: {
      const {
        applications,
      }: {
        applications: Application[];
      } = action;
      return {
        ...state,
        applications,
        error: undefined,
        applicationsLoadingStatus: Status.Loaded,
      };
    }

    case PROJECT_APPLICATIONS_ERROR: {
      const { error } = action;
      return {
        ...state,
        applications: state.applications,
        error,
        applicationsLoadingStatus: Status.Error,
      };
    }

    case PROJECT_STATUS_LOADING: {
      return {
        ...state,
        status: Status.Loading,
      };
    }

    case PROJECT_STATUS_LOADED: {
      const {
        applicationStatus,
      }: {
        applicationStatus: string;
      } = action;
      return {
        ...state,
        applications: [
          // update the status of the application
          ...state.applications.map((application) => ({
            ...application,
            applicationStatus: applicationStatus as AppStatus,
          })),
        ],
      };
    }

    case PROJECT_STATUS_ERROR: {
      return {
        ...state,
      };
    }

    default: {
      return state;
    }
  }
};
