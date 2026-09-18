// Oriented ground footprints, with a spatial index for static street furniture.
export function footprint(x,z,halfWidth,halfLength,angle=0) {
  const s=Math.sin(angle),c=Math.cos(angle);
  return {x,z,halfWidth,halfLength,axes:[{x:c,z:-s},{x:s,z:c}],radius:Math.hypot(halfWidth,halfLength)};
}
export function overlaps(a,b,gap=0) {
  if(Math.hypot(a.x-b.x,a.z-b.z)>a.radius+b.radius+gap)return false;
  for(const axis of [...a.axes,...b.axes]) {
    const extent=q=>q.halfWidth*Math.abs(axis.x*q.axes[0].x+axis.z*q.axes[0].z)+q.halfLength*Math.abs(axis.x*q.axes[1].x+axis.z*q.axes[1].z);
    if(Math.abs((a.x-b.x)*axis.x+(a.z-b.z)*axis.z)>=extent(a)+extent(b)+gap)return false;
  }
  return true;
}
export function obstacleIndex() {
  const cells=new Map(),size=12;
  function keys(b){const result=[];for(let x=Math.floor((b.x-b.radius)/size);x<=Math.floor((b.x+b.radius)/size);x++)for(let z=Math.floor((b.z-b.radius)/size);z<=Math.floor((b.z+b.radius)/size);z++)result.push(`${x},${z}`);return result}
  return {
    add(b){for(const key of keys(b)){if(!cells.has(key))cells.set(key,[]);cells.get(key).push(b)}},
    hits(b){const seen=new Set();for(const key of keys(b))for(const other of cells.get(key)||[]){if(seen.has(other))continue;seen.add(other);if(overlaps(b,other,.12))return true}return false}
  };
}
