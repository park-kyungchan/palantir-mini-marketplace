import type { AipFdeLocalSurfaceContract } from "../../core/contracts/aip-fde-local-surface";
import {
  validatePalantirSourceAuthority,
  type PalantirSourceAuthorityValidationResult,
} from "../../lib/research/palantir-source-authority";

export interface PmAipSourceAuthorityValidateArgs {
  readonly surfaceContract: AipFdeLocalSurfaceContract;
}

export async function pmAipSourceAuthorityValidate(
  args: PmAipSourceAuthorityValidateArgs,
): Promise<PalantirSourceAuthorityValidationResult> {
  if (!args.surfaceContract || typeof args.surfaceContract !== "object") {
    return {
      status: "fail",
      checkedRefCount: 0,
      issues: [
        {
          issueId: "palantir-authority.missing-surface-contract",
          field: "surfaceContract",
          message: "surfaceContract object is required.",
        },
      ],
    };
  }
  return validatePalantirSourceAuthority(args.surfaceContract);
}

export default async function pmAipSourceAuthorityValidateHandler(
  rawArgs: unknown,
): Promise<PalantirSourceAuthorityValidationResult> {
  const args = (rawArgs ?? {}) as PmAipSourceAuthorityValidateArgs;
  return pmAipSourceAuthorityValidate(args);
}
