/**
 * http://insilab.org/maxclique/
 */

import { ArrayHelper } from './array-helper';

class ColorClass {
  private i: number[] = [];
  private sz = 0;

  constructor(size: number = 0) {
    this.init(size);
  }

  init(size: number) {
    this.i = Array.from({ length: size }, () => 0);
    this.rewind();
  }
  push(value: number) {
    this.i[this.sz++] = value;
  }
  pop() {
    --this.sz;
  }
  rewind() {
    this.sz = 0;
  }
  get size(): number {
    return this.sz;
  }
  at(index: number) {
    return this.i[index];
  }
  assign(r: ColorClass) {
    for (let n = 0; n < r.sz; ++n) this.i[n] = r.i[n];
    this.sz = r.sz;
  }
}

class StepCount {
  public i1 = 0;
  public i2 = 0;

  incrementI1() {
    ++this.i1;
  }
}

class Vertex {
  private i: number = 0;
  private d: number = 0;

  public setI(i: number) {
    this.i = i;
  }
  public getI(): number {
    return this.i;
  }

  public setDegree(d: number) {
    this.d = d;
  }
  public getDegree(): number {
    return this.d;
  }
}

class Vertices {
  private v: Vertex[] = [];
  private sz = 0;

  constructor(size: number) {
    this.v = Array.from({ length: size }, () => new Vertex());
    this.sz = 0;
  }

  dispose() {
    this.v.length = 0;
  }

  sort() {
    ArrayHelper.quickSort(
      this.v,
      Vertices.comparatorByDegreeDesc,
      0,
      this.sz - 1
    );
  }

  initColors() {
    const maxDegree = this.v[0].getDegree();

    for (let n = 0; n < maxDegree; ++n) {
      this.v[n].setDegree(n + 1);
    }

    for (let n = maxDegree; n < this.v.length; ++n) {
      this.v[n].setDegree(maxDegree + 1);
    }
  }

  setDegree(m: MaxClique) {
    for (let i = 0; i < this.sz; ++i) {
      let d = 0;
      for (let j = 0; j < this.sz; ++j) {
        if (m.connection(this.v[i].getI(), this.v[j].getI())) {
          ++d;
        }
      }

      this.v[i].setDegree(d);
    }
  }

  get size() {
    return this.sz;
  }

  push(value: number) {
    this.v[this.sz++].setI(value);
  }

  pop() {
    --this.sz;
  }

  at(index: number) {
    return this.v[index];
  }

  get end() {
    return this.v[this.sz - 1];
  }

  static comparatorByDegreeDesc(a: Vertex, b: Vertex): boolean {
    return b.getDegree() < a.getDegree();
  }
}

export class MaxClique {
  private step = 0;
  private level = 1;
  private v: Vertices;
  private c: ColorClass[];
  private qmax: ColorClass = new ColorClass();
  private q: ColorClass = new ColorClass();
  private s: StepCount[];

  constructor(
    private adjacencyMatrix: boolean[][],
    private readonly tLimit = 0.025
  ) {
    this.v = new Vertices(adjacencyMatrix.length);
    for (let n = 0; n < adjacencyMatrix.length; ++n) this.v.push(n);

    this.c = Array.from(
      { length: adjacencyMatrix.length + 1 },
      () => new ColorClass()
    );
    for (let n = 0; n < adjacencyMatrix.length + 1; ++n)
      this.c[n].init(adjacencyMatrix.length + 1);

    this.s = Array.from(
      { length: adjacencyMatrix.length + 1 },
      () => new StepCount()
    );
  }

  mcq() {
    return this.mcqInternal(false);
  }
  mcqDyn() {
    return this.mcqInternal(true);
  }

  connection(row: number, column: number) {
    return this.adjacencyMatrix[row][column];
  }

  private mcqInternal(dyn: boolean): number[] {
    this.v.setDegree(this);
    this.v.sort();
    this.v.initColors();

    if (dyn) {
      for (let n = 0; n < this.v.size; ++n) {
        this.s[n].i1 = 0;
        this.s[n].i2 = 0;
      }

      this.expandDyn(this.v);
    } else {
      this.expand(this.v);
    }

    return Array.from({ length: this.qmax.size }, (_, n) => this.qmax.at(n));
  }

  private expand(r: Vertices) {
    while (r.size) {
      if (this.q.size + r.end.getDegree() > this.qmax.size) {
        this.q.push(r.end.getI());
        const rp = new Vertices(r.size);
        this.cut2(r, rp);
        if (rp.size) {
          this.colorSort(rp);
          ++this.step;
          this.expand(rp);
        } else if (this.q.size > this.qmax.size) {
          this.qmax.assign(this.q);
        }
        rp.dispose();
        this.q.pop();
      } else {
        return;
      }

      r.pop();
    }
  }

  private expandDyn(r: Vertices) {
    this.s[this.level].i1 =
      this.s[this.level].i1 + this.s[this.level - 1].i1 - this.s[this.level].i2;
    this.s[this.level].i2 = this.s[this.level - 1].i1;

    while (r.size) {
      if (this.q.size + r.end.getDegree() > this.qmax.size) {
        this.q.push(r.end.getI());
        const rp = new Vertices(r.size);
        this.cut2(r, rp);
        if (rp.size) {
          if (this.s[this.level].i1 / ++this.step < this.tLimit) {
            this.degreeSort(rp);
          }
          this.colorSort(rp);
          this.s[this.level].incrementI1();
          ++this.level;
          this.expandDyn(rp);
          --this.level;
        } else if (this.q.size > this.qmax.size) {
          this.qmax.assign(this.q);
        }

        rp.dispose();
        this.q.pop();
      } else {
        return;
      }

      r.pop();
    }
  }

  private degreeSort(r: Vertices) {
    r.setDegree(this);
    r.sort();
  }

  private colorSort(r: Vertices) {
    let j = 0;
    let maxno = 1;
    let minK = this.qmax.size - this.q.size + 1;
    this.c[1].rewind();
    this.c[2].rewind();
    let k = 1;
    for (let i = 0; i < r.size; ++i) {
      const pi = r.at(i).getI();
      k = 1;
      while (this.cut1(pi, this.c[k])) ++k;

      if (k > maxno) {
        maxno = k;
        this.c[maxno + 1].rewind();
      }

      this.c[k].push(pi);

      if (k < minK) {
        r.at(j++).setI(pi);
      }
    }

    if (j > 0) r.at(j - 1).setDegree(0);
    if (minK <= 0) minK = 1;
    for (k = minK; k <= maxno; ++k) {
      for (let i = 0; i < this.c[k].size; ++i) {
        r.at(j).setI(this.c[k].at(i));
        r.at(j++).setDegree(k);
      }
    }
  }

  private cut1(pi: number, a: ColorClass): boolean {
    for (let n = 0; n < a.size; ++n) {
      if (this.connection(pi, a.at(n))) {
        return true;
      }
    }

    return false;
  }

  private cut2(a: Vertices, b: Vertices) {
    for (let n = 0; n < a.size - 1; ++n) {
      if (this.connection(a.end.getI(), a.at(n).getI())) {
        b.push(a.at(n).getI());
      }
    }
  }
}
