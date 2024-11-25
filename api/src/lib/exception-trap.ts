/* eslint-disable @typescript-eslint/no-explicit-any */
type Callable = (...args: any[]) => any;

interface ReturnStatement<TRet> {
  Value(): TRet;
}

class CatchBlock<TTry extends Callable, TReturnStatementType = void> {
  constructor(
    private fn: TTry,
    private args: Parameters<TTry>,
    private returnStatement?: ReturnStatement<TReturnStatementType>
  ) {}

  CatchFn<TCatch extends Callable>(
    fn: TCatch,
    ...args: Parameters<TCatch>
  ):
    | (TReturnStatementType extends void
        ? ReturnType<TTry>
        : TReturnStatementType)
    | ReturnType<TCatch> {
    try {
      const ret = this.fn(...this.args);
      return this.returnStatement?.Value() ?? ret;
    } catch (e) {
      return fn(...args);
    }
  }

  CatchValue<T>(
    value: T
  ):
    | (TReturnStatementType extends void
        ? ReturnType<TTry>
        : TReturnStatementType)
    | T {
    try {
      const ret = this.fn(...this.args);
      return this.returnStatement?.Value() ?? ret;
    } catch (e) {
      return value;
    }
  }
}

class BranchBlock<TTry extends Callable> {
  constructor(
    private fn: TTry,
    private args: Parameters<TTry>
  ) {}

  ReturnValue<TRet>(value: TRet) {
    return new CatchBlock(this.fn, this.args, { Value: () => value });
  }

  ReturnFn<TCatch extends Callable>(fn: TCatch, ...args: Parameters<TCatch>) {
    return new CatchBlock(this.fn, this.args, { Value: () => fn(...args) });
  }

  CatchFn<TCatch extends Callable>(
    fn: TCatch,
    ...args: Parameters<TCatch>
  ): ReturnType<TTry> | ReturnType<TCatch> {
    return new CatchBlock(this.fn, this.args).CatchFn(fn, ...args);
  }

  CatchValue<T>(value: T): ReturnType<TTry> | T {
    return new CatchBlock(this.fn, this.args).CatchValue(value);
  }
}

export class ExceptionTrap {
  static Try<T extends Callable>(fn: T, ...args: Parameters<T>) {
    return new BranchBlock(fn, args);
  }
}

type AsyncCallable = (...args: any[]) => Promise<any>;

class AsyncCatchBlock<TTry extends AsyncCallable, TReturnStatementType = void> {
  constructor(
    private fn: TTry,
    private args: Parameters<TTry>,
    private returnStatement?: ReturnStatement<TReturnStatementType>
  ) {}

  async CatchFn<TCatch extends AsyncCallable>(
    fn: TCatch,
    ...args: Parameters<TCatch>
  ): Promise<
    | (TReturnStatementType extends void
        ? ReturnType<TTry>
        : TReturnStatementType)
    | ReturnType<TCatch>
  > {
    try {
      const ret = await this.fn(...this.args);
      return this.returnStatement?.Value() ?? ret;
    } catch (e) {
      return await fn(...args);
    }
  }

  async CatchValue<T>(
    value: T
  ): Promise<
    | (TReturnStatementType extends void
        ? ReturnType<TTry>
        : TReturnStatementType)
    | T
  > {
    try {
      const ret = await this.fn(...this.args);
      return this.returnStatement?.Value() ?? ret;
    } catch (e) {
      return await value;
    }
  }
}

class AsyncBranchBlock<TTry extends Callable> {
  constructor(
    private fn: TTry,
    private args: Parameters<TTry>
  ) {}

  ReturnValue<TRet>(value: TRet) {
    return new AsyncCatchBlock(this.fn, this.args, { Value: () => value });
  }

  ReturnFn<TCatch extends Callable>(fn: TCatch, ...args: Parameters<TCatch>) {
    return new AsyncCatchBlock(this.fn, this.args, {
      Value: () => fn(...args)
    });
  }

  async CatchFn<TCatch extends AsyncCallable>(
    fn: TCatch,
    ...args: Parameters<TCatch>
  ): Promise<ReturnType<TTry> | ReturnType<TCatch>> {
    return new AsyncCatchBlock(this.fn, this.args).CatchFn(fn, ...args);
  }

  async CatchValue<T>(value: T): Promise<ReturnType<TTry> | T> {
    return new AsyncCatchBlock(this.fn, this.args).CatchValue(value);
  }
}

export class AsyncExceptionTrap {
  static Try<T extends AsyncCallable>(fn: T, ...args: Parameters<T>) {
    return new AsyncBranchBlock(fn, args);
  }
}
