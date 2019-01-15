var method = User.prototype;
function User(properties) {
    this._properties = properties;
}
method.getproperties = function () {
    return this._properties;
};
module.exports = User;
