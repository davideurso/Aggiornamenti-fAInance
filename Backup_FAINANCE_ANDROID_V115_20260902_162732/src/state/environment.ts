import { appEnvironment } from "../config/env";

export const isTestEnvironment = appEnvironment === "test";
export const isProductionEnvironment = appEnvironment === "production";
