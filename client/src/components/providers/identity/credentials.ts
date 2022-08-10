// --- Types
import {
  DIDKitLib,
  RequestPayload,
  VerifiableCredential,
  IssuedChallenge,
  CredentialResponseBody,
  VerifiableCredentialRecord,
} from "@gitcoinco/passport-sdk-types";

// --- Node/Browser http req library
import axios from "axios";

// Keeping track of the hashing mechanism (algo + content)
export const VERSION = "v0.0.0";

// Verify that the provided credential is valid
export const verifyCredential = async (
  DIDKit: DIDKitLib,
  credential: VerifiableCredential
): Promise<boolean> => {
  // extract expirationDate
  const { expirationDate, proof } = credential;
  // check that the credential is still valid
  if (new Date(expirationDate) > new Date()) {
    try {
      // parse the result of attempting to verify
      const verify = JSON.parse(
        await DIDKit.verifyCredential(
          JSON.stringify(credential),
          `{"proofPurpose":"${proof.proofPurpose}"}`
        )
      ) as { checks: string[]; warnings: string[]; errors: string[] };

      // did we get any errors when we attempted to verify?
      return verify.errors.length === 0;
    } catch (e) {
      // if didkit throws, etc.
      return false;
    }
  } else {
    // past expiry :(
    return false;
  }
};

// Fetch a verifiable challenge credential
export const fetchChallengeCredential = async (
  iamUrl: string,
  payload: RequestPayload
): Promise<IssuedChallenge> => {
  // fetch challenge as a credential from API that fits the version, address and type (this credential has a short ttl)

  const response: { data: CredentialResponseBody } = await axios.post(
    `${iamUrl.replace(/\/*?$/, "")}/v${payload.version}/challenge`,
    {
      payload: {
        address: payload.address,
        type: payload.type,
      },
    }
  );

  return {
    challenge: response.data.credential,
  } as IssuedChallenge;
};

export type GHOrgRequestPayload = RequestPayload & {
  org?: string;
};

// Fetch a verifiableCredential
export const fetchVerifiableCredential = async (
  iamUrl: string,
  payload: GHOrgRequestPayload,
  signer: { signMessage: (message: string) => Promise<string> } | undefined
): Promise<VerifiableCredentialRecord> => {
  // must provide signature for message
  if (!signer) {
    throw new Error("Unable to sign message without a signer");
  }

  // first pull a challenge that can be signed by the user
  const { challenge } = await fetchChallengeCredential(iamUrl, payload);

  // sign the challenge provided by the IAM
  const signature = challenge.credentialSubject.challenge
    ? (
        await signer.signMessage(challenge.credentialSubject.challenge)
      ).toString()
    : "";

  // must provide signature for message
  if (!signature) {
    throw new Error("Unable to sign message");
  }

  // pass the signature as part of the proofs obj
  // eslint-disable-next-line no-param-reassign
  payload.proofs = { ...payload.proofs, ...{ signature } };

  // fetch a credential from the API that fits the version, payload and passes the signature message challenge
  const response: { data: CredentialResponseBody } = await axios.post(
    `${iamUrl.replace(/\/*?$/, "")}/v${payload.version}/verify`,
    {
      payload,
      challenge,
    }
  );

  // return everything that was used to create the credential (along with the credential)
  return {
    signature,
    challenge,
    record: response.data.record,
    credential: response.data.credential,
  } as VerifiableCredentialRecord;
};
