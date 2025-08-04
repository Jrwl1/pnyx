import { Controller, Get } from '@nestjs/common';
import { PoliticianService } from './politician.service';

/**
 * API controller for all politician-related endpoints.
 * Exposes a public GET endpoint to list all politicians.
 */
@Controller('politicians')
export class PoliticianController {
  constructor(private readonly politicianService: PoliticianService) {}

  @Get()
  async findAll() {
    return this.politicianService.findAll();
  }
}
