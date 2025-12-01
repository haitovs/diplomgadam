declare module "leaflet" {
  export type LatLngTuple = [number, number];
  export type LatLngLiteral = { lat: number; lng: number };
  export type LatLngExpression = LatLngTuple | LatLngLiteral;

  export interface MapOptions {
    center?: LatLngExpression;
    zoom?: number;
    [key: string]: unknown;
  }

  export interface TileLayerOptions {
    attribution?: string;
    [key: string]: unknown;
  }

  export interface MarkerOptions {
    icon?: Icon;
    [key: string]: unknown;
  }

  export interface PathOptions {
    [key: string]: unknown;
  }

  export interface FitBoundsOptions {
    padding?: [number, number];
  }

  export type LatLngBoundsExpression = [LatLngTuple, LatLngTuple] | LatLngLiteral[];

  export interface LeafletEvent {
    type: string;
    target: unknown;
    [key: string]: unknown;
  }

  export type LeafletEventHandlerFn = (event: LeafletEvent) => void;
  export type LeafletEventHandlerFnMap = Record<string, LeafletEventHandlerFn>;

  export interface Evented {
    on: (event: string, handler: LeafletEventHandlerFn) => void;
    off: (event: string, handler?: LeafletEventHandlerFn) => void;
  }

  export class Icon<T = any> {
    constructor(options?: T);
  }

  export class Map {
    constructor(element?: HTMLElement | string, options?: MapOptions);
  }

  export class Layer {}

  export class TileLayer<T = any> {
    constructor(url: string, options?: TileLayerOptions);
  }

  export class FeatureGroup extends Layer {}

  export class Path extends Layer {}

  export class Marker<T = any> {
    constructor(position: LatLngExpression, options?: MarkerOptions);
  }

  export class Popup {}
}
