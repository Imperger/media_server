import { TouchEvent, Touch } from 'react';

export enum SwipeDirecion {
  Left = 1 << 0,
  Up = 1 << 1,
  Right = 1 << 2,
  Down = 1 << 3
}

export interface SwipeRule {
  type: 'swipe';
  direction: SwipeDirecion;
  touchMoveThreshold: number;
  DataType?: { direction: SwipeDirecion };
}

export type TouchRule = SwipeRule;

export interface Gesture {
  rule: TouchRule;
  data: NonNullable<TouchRule['DataType']>;
}

export type EventListener = (e: Gesture) => void;
export type ListenerReleaser = () => void;

export class GesturesRecognizer {
  private touches: Touch[] = [];
  private swipeRules: SwipeRule[] = [];
  private listeners: EventListener[] = [];

  constructor(rules: TouchRule[]) {
    for (const rule of rules) {
      switch (rule.type) {
        case 'swipe':
          this.swipeRules.push(rule);
          break;
      }
    }
  }

  addEventListener(listener: (e: Gesture) => void): ListenerReleaser {
    this.listeners.push(listener);

    return () => this.listeners.splice(this.listeners.indexOf(listener), 1);
  }

  onTouchStart(e: TouchEvent): void {
    for (let n = 0; n < e.changedTouches.length; ++n) {
      this.touches.push(e.changedTouches[n]);
    }
  }

  onTouchMove(_e: TouchEvent): void {}

  onTouchCancel(e: TouchEvent): void {
    this.releaseTouch(e);
  }

  onTouchEnd(e: TouchEvent): void {
    if (this.hasSwipeRules && this.isSatisfiedSwipeRules) {
      this.processSwipeRules(e);
    }

    this.releaseTouch(e);
  }

  private releaseTouch(e: TouchEvent): void {
    for (let n = 0; n < e.changedTouches.length; ++n) {
      const trackedIdx = this.touches.findIndex(
        (x) => x.identifier === e.changedTouches[n].identifier
      );

      if (trackedIdx !== -1) {
        this.touches.splice(trackedIdx, 1);
      }
    }
  }

  private get hasSwipeRules(): boolean {
    return this.swipeRules.length > 0;
  }

  private get isSatisfiedSwipeRules(): boolean {
    return this.touches.length === 1;
  }

  private broadcast(e: Gesture): void {
    this.listeners.forEach((x) => x(e));
  }

  private processSwipeRules(e: TouchEvent): void {
    const endTouch = e.changedTouches[0];
    const origVector = {
      x: endTouch.clientX - this.touches[0].clientX,
      y: endTouch.clientY - this.touches[0].clientY
    };

    let direction: SwipeDirecion;
    let distanceAlongAxis = 0;
    if (Math.abs(origVector.x) > Math.abs(origVector.y)) {
      direction = origVector.x > 0 ? SwipeDirecion.Right : SwipeDirecion.Left;
      distanceAlongAxis = Math.abs(origVector.x);
    } else {
      direction = origVector.y > 0 ? SwipeDirecion.Down : SwipeDirecion.Up;
      distanceAlongAxis = Math.abs(origVector.y);
    }

    const rule = this.swipeRules.find(
      (x) => x.direction & direction && x.touchMoveThreshold < distanceAlongAxis
    );

    if (rule !== undefined) {
      this.broadcast({ rule, data: { direction } });
    }
  }
}
