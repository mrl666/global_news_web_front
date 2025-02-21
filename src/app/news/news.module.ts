import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { NewsService } from './services/news.service';

@NgModule({
  imports: [HttpClientModule],
  providers: [NewsService] // Provide the NewsService
})
export class NewsModule {
  
 }
