import { ethers } from "ethers";
import { useSigner } from "wagmi";
import { useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { fetchGrantData } from "../../actions/grantsMetadata";
import { loadAllChainsProjects } from "../../actions/projects";
import { global } from "../../global";
import { RootState } from "../../reducers";
import { Status } from "../../reducers/grantsMetadata";
import { editPath, grantsPath } from "../../routes";
import colors from "../../styles/colors";
import { getProjectImage, ImgTypes } from "../../utils/components";
import {
  getProjectURIComponents,
  getProviderByChainId,
} from "../../utils/utils";
import Button, { ButtonVariants } from "../base/Button";
import Arrow from "../icons/Arrow";
import Pencil from "../icons/Pencil";
import Details from "./Details";
import ProjectRegistryABI from "../../contracts/abis/ProjectRegistry.json";
import { addressesByChainID } from "../../contracts/deployments";
import PageNotFound from "../base/PageNotFound";

const formattedDate = (timestamp: number | undefined) =>
  new Date((timestamp ?? 0) * 1000).toLocaleString("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

function Project() {
  const [updatedAt, setUpdatedAt] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const { data: signer } = useSigner();
  const [owners, setOwners] = useState<string[]>([]);
  const [signerAddress, setSignerAddress] = useState<null | string>(null);

  const dispatch = useDispatch();
  // FIXME: params.id doesn't change if the location hash is changed manually.
  const params = useParams();

  let appProvider: ethers.providers.BaseProvider | undefined;

  try {
    appProvider = getProviderByChainId(Number(params.chainId));
  } catch (e) {
    console.log(e);
  }

  const props = useSelector((state: RootState) => {
    const fullId = `${params.chainId}:${params.registryAddress}:${params.id}`;

    const grantMetadata = state.grantsMetadata[fullId];

    const loading = grantMetadata
      ? grantMetadata.status === Status.Loading
      : false;

    const loadingFailed =
      grantMetadata && (!appProvider || grantMetadata.status === Status.Error);

    const bannerImg = getProjectImage(
      loading,
      ImgTypes.bannerImg,
      grantMetadata?.metadata
    );
    const logoImg = getProjectImage(
      loading,
      ImgTypes.logoImg,
      grantMetadata?.metadata
    );

    return {
      id: fullId,
      appProvider,
      loading,
      loadingFailed,
      bannerImg,
      logoImg,
      currentProject: grantMetadata?.metadata,
      projectEvents: state.projects.events[fullId],
    };
  }, shallowEqual);

  useEffect(() => {
    // called twice
    // 1 - when it loads or id changes (it checks if it's cached in local storage)
    // 2 - when ipfs is initialized (it fetches it if not loaded yet)
    if (props.id !== undefined && props.currentProject === undefined) {
      dispatch(fetchGrantData(props.id));
    }
  }, [dispatch, props.id, props.currentProject]);

  useEffect(() => {
    let unloaded = false;

    if (props.appProvider && props.projectEvents !== undefined) {
      const { createdAtBlock, updatedAtBlock } = props.projectEvents;
      if (createdAtBlock !== undefined) {
        props.appProvider.getBlock(createdAtBlock).then((data) => {
          if (!unloaded) {
            setCreatedAt(formattedDate(data?.timestamp));
          }
        });
      }

      if (updatedAtBlock !== undefined) {
        props.appProvider.getBlock(updatedAtBlock).then((data) => {
          if (!unloaded) {
            setUpdatedAt(formattedDate(data?.timestamp));
          }
        });
      }
    } else {
      // If user reloads Show projects will not exist
      dispatch(loadAllChainsProjects(true));
    }

    return () => {
      unloaded = true;
    };
  }, [props.id, props.appProvider, props.projectEvents, global, dispatch]);

  // Fetch the project owners
  useEffect(() => {
    if (!signer) {
      return;
    }

    const fetchOwners = async (chainId: number, projectId: string) => {
      const addresses = addressesByChainID(chainId);

      const projectRegistry = new ethers.Contract(
        addresses.projectRegistry,
        ProjectRegistryABI,
        signer
      );

      return projectRegistry.getProjectOwners(projectId);
    };

    fetchOwners(Number(params.chainId), params.id!).then((newOwners) => {
      setOwners(newOwners);
    });
  }, [props.id, signer, global, dispatch]);

  // Set the signer address
  useEffect(() => {
    signer?.getAddress().then((address) => setSignerAddress(address));
  }, [signer]);

  if (
    props.currentProject === undefined &&
    props.loading &&
    props.currentProject
  ) {
    return <>Loading grant data from IPFS... </>;
  }

  function createEditPath() {
    const { chainId, registryAddress, id } = getProjectURIComponents(props.id);
    return editPath(chainId, registryAddress, id);
  }

  if (props.loadingFailed) {
    return (
      <div>
        <PageNotFound />
      </div>
    );
  }

  return (
    <div>
      {props.currentProject && (
        <>
          <div className="flex justify-between items-center mb-6">
            <Link to={grantsPath()}>
              <h3 className="flex">
                <div className="pt-2 mr-2">
                  <Arrow color={colors["primary-text"]} />{" "}
                </div>
                Project Details
              </h3>
            </Link>
            {props.id && owners.includes(signerAddress!) && (
              <Link to={createEditPath()} className="sm:w-auto mx-w-full ml-0">
                <Button
                  variant={ButtonVariants.outline}
                  styles={["sm:w-auto mx-w-full ml-0"]}
                >
                  <i className="icon mt-1">
                    <Pencil color={colors["secondary-text"]} />
                  </i>
                  &nbsp; Edit
                </Button>
              </Link>
            )}
          </div>
          <Details
            project={props.currentProject}
            createdAt={createdAt}
            updatedAt={updatedAt}
            logoImg={props.logoImg}
            bannerImg={props.bannerImg}
            showApplications
          />
        </>
      )}
    </div>
  );
}

export default Project;
