import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root' // Provided in the root injector for easy access
})
export class NewsService {
  private apiKey = 'ba14242063f9499f86ad31c19a622523'; 
  private newsApiUrl = 'https://newsapi.org/v2/everything';

  private locationIqApiKey = 'pk.e1fc80bdb318fa83878a314c825567c0'; 

  constructor(private http: HttpClient) {}

  getNewsByCoordinates(latitude: number, longitude: number): Observable<any> {
    return this.getLocationFromCoords(latitude, longitude).pipe(
      switchMap((locationData: any) => {
        let query = '';
  
        if (locationData.address.city) {
          query = locationData.address.city; // 🎯 Priority: City
          console.log(`Fetching news for city: ${query}`);
        } else if (locationData.address.state) {
          query = locationData.address.state; // 🏛️ Fallback: State
          console.log(`Fetching news for state: ${query}`);
        } else if (locationData.address.country) {
          query = locationData.address.country; // 🌍 Last fallback: Country
          console.log(`Fetching news for country: ${query}`);
        } else {
          console.warn("Could not determine location. Using default news query.");
          query = "World News"; // 🔹 Absolute fallback
        }
  
        console.log(`Finally fetching news for: ${query}`);
        const url = `${this.newsApiUrl}?q=${encodeURIComponent(query)}&language=en&apiKey=${this.apiKey}`;
  
        // ✅ RETURN the HTTP request as an Observable
        return this.http.get(url);
      })
    );
  }
  
  getLocationFromCoords(latitude: number, longitude: number): Observable<any> {
    const url = `https://us1.locationiq.com/v1/reverse.php?key=${this.locationIqApiKey}&lat=${latitude}&lon=${longitude}&format=json&accept-language=en`;
  
    return this.http.get(url);
  }

  getFallbackNews(query: string): Observable<any> {
    const url = `${this.newsApiUrl}?q=${encodeURIComponent(query)}&language=en&apiKey=${this.apiKey}`;
    return this.http.get(url);
  }
  
  
  
}