export const isPromise = obj => obj && typeof obj.then === 'function';
export const getPromiseKeys = obj => Object.keys(obj).filter(key => isPromise(obj[key]));

export const resolveProps = obj => {
  const props = Object.keys(obj);
  const values = props.map(prop => obj[prop]);

  return Promise.all(values).then(resolvedArray => {
    return props.reduce((acc, prop, index) => {
      acc[prop] = resolvedArray[index];
      return acc;
    }, {});
  });
};

export const getNonPromiseProperties = obj => {
  return Object.keys(obj).filter(key => !isPromise(obj[key])).reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {});
};

export const objectWithoutProperties = (obj, keys) => {
  var target = {};
  for (var i in obj) {
    if (keys.indexOf(i) >= 0) continue;

    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
    target[i] = obj[i];
  }
  return target;
}
