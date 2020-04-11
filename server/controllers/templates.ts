require("dotenv").config({ path: "./.env" });
import { Template } from "../models/templates";
import { errorHandler } from "../services/common";

export const loadTemplateList = async function(req, res) {
  try {
    let select = "";
    if (req.query.full) {
      select = "";
    } else {
      select = "name teamSize teamFormat";
    }
    let predicate = {};
    if (req.query.teamFormat) {
      if (req.query.teamFormat === "single")
        predicate = { teamFormat: "single" };
      else predicate = { teamFormat: { $ne: "single" } };
    }
    const templateList = await Template.find(predicate)
      .select(select)
      .lean()
      .exec();
    res.json({ templateList: templateList });
  } catch (e) {
    errorHandler(e, "load templates error");
  }
};

export const loadTemplate = async function(req, res) {
  try {
    const template = await Template.findById(req.params.id)
      .lean()
      .exec();
    res.json({ template: template });
  } catch (e) {
    errorHandler(e, "load template error");
  }
};

export const addTemplate = async function(req, res) {
  try {
    const newTemplate = processPostSurvey(req.body);
    const template = await Template.create(newTemplate);
    res.json({ template: template });
  } catch (e) {
    errorHandler(e, "add template error");
  }
};

export const deleteTemplate = async function(req, res) {
  try {
    await Template.findByIdAndRemove(req.body._id).exec();
    res.json({ template: { _id: req.body._id } });
  } catch (e) {
    errorHandler(e, "add template error");
  }
};

export const cloneTemplate = async function(req, res) {
  try {
    let original = await Template.findById(req.body._id)
      .lean()
      .exec();
    if (!original.teamFormat) {
      original.teamFormat = "multi";
      if (!original.numExpRounds) {
        original.numExpRounds = 2; // for testing in dev
      }
    }
    delete original._id;
    original.name = original.name + " (copy)";
    const template = await Template.create(original);
    res.json({
      template: {
        _id: template._id,
        name: template.name,
        teamSize: template.teamSize,
        teamFormat: template.teamFormat,
      },
    });
  } catch (e) {
    errorHandler(e, "clone template error");
  }
};

export const updateTemplate = async function(req, res) {
  try {
    const updatedTemplate = processPostSurvey(req.body);
    const template = await Template.findByIdAndUpdate(
      updatedTemplate._id,
      { $set: updatedTemplate },
      { new: true }
    )
      .lean()
      .exec();
    res.json({ template: template });
  } catch (e) {
    errorHandler(e, "add template error");
  }
};

const processPostSurvey = (reqBody) => {
  let template = reqBody;
  const lastTask = template.tasks[template.tasks.length - 1];
  console.log(lastTask, lastTask.hasPostSurvey);
  if (lastTask.hasPostSurvey) {
    template.hasPostSurvey = true;
    template.postSurvey = lastTask.postSurvey;
  }
  return template;
};
