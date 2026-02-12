// Utilities

// Style utilities for Base UI
export type { BaseUIState, DataSelector } from "./lib/styles";
export {
	createStateClass,
	createVariants,
	dataSelectors,
	mergeProps,
} from "./lib/styles";
export { cn } from "./lib/utils";

// Styled components built on Base UI will be exported here.
// Import Base UI primitives directly: import { Dialog } from "@base-ui/react/dialog"
