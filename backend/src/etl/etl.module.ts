import { Module } from '@nestjs/common';
import { EtlService } from './etl.service';

@Module({
    providers: [EtlService],
    exports: [EtlService],
})
export class EtlModule { }
