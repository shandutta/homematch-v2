declare module 'polygon-clipping' {
  export type Point = [number, number]
  export type Ring = Point[]
  export type Polygon = Ring[]
  export type MultiPolygon = Polygon[]

  export function union(...polygons: MultiPolygon[]): MultiPolygon
  export function intersection(...polygons: MultiPolygon[]): MultiPolygon
  export function difference(
    subject: MultiPolygon,
    ...clips: MultiPolygon[]
  ): MultiPolygon
  export function xor(...polygons: MultiPolygon[]): MultiPolygon

  const polygonClipping: {
    union: typeof union
    intersection: typeof intersection
    difference: typeof difference
    xor: typeof xor
  }

  export default polygonClipping
}
