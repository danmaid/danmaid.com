import { afterAll, describe, expect, test } from "@jest/globals";
import { Logger } from "./index";

test("", async () => {
  const logger = new Logger();
  logger.log("xyz");
  logger.close();
});
