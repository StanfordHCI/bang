import { User } from "../models/users";
require("dotenv").config({ path: "./.env" });
import { errorHandler } from "../services/common";
import { disassociateQualificationFromWorker, runningLive } from "./utils";
const logger = require("../services/logger");

export const unsubscribe = async function(req, res) {
  try {
    logger.info(
      module,
      `Unsubscribe was called with the the MTurkId= ${req.params.id}`
    );

    if (!req.params.id) res.json({ user: "" });

    const userOfInterest = await User.findOne({ mturkId: `${req.params.id}` })
      .lean()
      .exec();

    if (userOfInterest === null || userOfInterest === undefined) 
    {
      res.json({ error: "User was not found" });
    } 
    else 
    {
      if (userOfInterest.systemStatus === "willbang") 
      {
        if (process.env.MTURK_MODE !== "off") 
        {
          await disassociateQualificationFromWorker(
            userOfInterest.mturkId,
            runningLive
              ? process.env.PROD_WILL_BANG_QUAL
              : process.env.TEST_WILL_BANG_QUAL,
            "User never got to complete the HIT; hence why this unsubscription."
          );
          logger.info(
            module,
            `Successful qualification disassociation of MTurkId= ${req.params.id}`
        )
        }
        
        await User.findByIdAndRemove(userOfInterest._id).lean().exec();

        res.json({ user: userOfInterest.mturkId });

        logger.info(
            module,
            `Successful unsubscription of MTurkId= ${req.params.id}`
        )
      } 
      else 
      {
        // throw "User has already completed a HIT"
        res.json({ error: "User has already completed a HIT" });
      }
    }
  } catch (e) {
    errorHandler(e, "unsubscribe user error");
  }
};
