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

    if (!req.params.id) res.json({ user: "", error: "" });

    const userOfInterest = await User.findOne({ mturkId: `${req.params.id}` })
      .lean()
      .exec();

    if (userOfInterest === null || userOfInterest === undefined) 
    {
      res.json({ user: `${req.params.id}`, error: 2 });
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

        res.json({ user: userOfInterest.mturkId, error: 0 });

        logger.info(
            module,
            `Successful unsubscription of MTurkId= ${req.params.id}`
        )
      } 
      else 
      {
        // throw "User has already completed a HIT"
        res.json({ user: "", error: 1 });
      }
    }
  } catch (e) {
    errorHandler(e, "unsubscribe user error");
  }
};
