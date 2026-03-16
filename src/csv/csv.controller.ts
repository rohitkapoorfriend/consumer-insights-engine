import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    ParseFilePipe,
    MaxFileSizeValidator,
    FileTypeValidator,
    BadRequestException,
  } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CsvService } from './csv.service';

const MAX_CSV_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@ApiTags('CSV Import')
@Controller('csv')
export class CsvController {
constructor(private readonly csvService: CsvService) {}

@Post('import')
@ApiOperation({ summary: 'Bulk import feedback entries from a CSV file' })
@ApiConsumes('multipart/form-data')
@ApiBody({
    schema: {
    type: 'object',
    properties: {
        file: {
        type: 'string',
        format: 'binary',
        description: 'CSV file with columns: text, source (optional), metadata (optional JSON)',
        },
    },
    },
})
@ApiResponse({ status: 201, description: 'Import started; returns job info and row count' })
@ApiResponse({ status: 400, description: 'Invalid file or CSV format error' })
@UseInterceptors(FileInterceptor('file'))
async importCsv(
    @UploadedFile(
    new ParseFilePipe({
        validators: [
        new MaxFileSizeValidator({ maxSize: MAX_CSV_SIZE_BYTES }),
        new FileTypeValidator({ fileType: /^text\/(csv|plain)$/ }),
        ],
    }),
    )
    file: Express.Multer.File,
) {
    if (!file) {
    throw new BadRequestException('No file uploaded');
    }

    return this.csvService.import(file.buffer);
}
}