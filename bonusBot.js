const mturk = require("./mturkTools");
const parse = require("csv-parse");
const tsvSettings = {
  columns: true,
  delimiter: "\t"
};

// TSV of bonuses from sheet
const bonusSheet = ``;

// TSV of results from MTURK
const bonusHITSubmissions = ``;

parse(bonusSheet, tsvSettings, function(err, bonusData) {
  if (err) throw err;
  parse(bonusHITSubmissions, tsvSettings, function(err, HITData) {
    if (err) throw err;
    const bonusable = bonusData
      .filter(u => {
        return HITData.map(v => v.WorkerId).includes(u.mturkId);
      })
      .map(u => {
        u.assignmentId = HITData.filter(
          v => v.WorkerId === u.mturkId
        )[0].AssignmentId;
        u.id = u.code + u.mturkId;
        return u;
      });
    // console.log(bonusable);
    mturk.payBonuses(bonusable);
  });
});
