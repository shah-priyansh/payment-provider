import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { StateMachineService } from './state-machine.service';
import { RetryService } from './retry.service';
import { MockBankModule } from '../mock-bank/mock-bank.module';

@Module({
  imports: [MockBankModule],
  providers: [TransactionsService, StateMachineService, RetryService],
  exports: [TransactionsService, RetryService],
})
export class TransactionsModule {}
