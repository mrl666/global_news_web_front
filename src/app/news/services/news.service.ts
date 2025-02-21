import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root' // Provided in the root injector for easy access
})
export class NewsService {
  private apiKey = 'ba14242063f9499f86ad31c19a622523'; // Replace with your API key
  private newsApiUrl = 'https://newsapi.org/v2/everything';

  constructor(private http: HttpClient) {}

  // Fetch news by coordinates
  getNewsByCoordinates(latitude: number, longitude: number): Observable<any> {
    const url = `${this.newsApiUrl}?q=${latitude},${longitude}&apiKey=${this.apiKey}`;
    return this.http.get(url);
  }

  // Fetch news by location name
  getNewsByLocation(locationName: string): Observable<any> {
    const url = `${this.newsApiUrl}?q=${locationName}&apiKey=${this.apiKey}`;
    return this.http.get(url);
  }
}