function addError(req,param,msg,index)
{
  if (req._validationErrors === undefined) {
    req._validationErrors = [];
  }
  var err = {param:param,msg:msg};
  if (typeof index != "undefined")  err.index = index;
  req.validationErrors().push(err);
}

function hasErrors(req)
{
  return !(req._validationErrors === undefined || req._validationErrors.length == 0)
}

function getErrors(req)
{
  return (req._validationErrors === undefined) ? [] : req._validationErrors;
}

exports.addError = addError;
exports.hasErrors = hasErrors;
exports.getErrors = getErrors;