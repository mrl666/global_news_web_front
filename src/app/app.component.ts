import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Viewer, Cartesian3, Math as CesiumMath, createWorldTerrainAsync } from 'cesium';
import { ScreenSpaceEventHandler, ScreenSpaceEventType, Cartographic } from 'cesium';
import { LabelCollection } from 'cesium';
import * as Cesium from 'cesium';
import { NewsService } from './news/services/news.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  viewer!: Viewer;
  labels!: LabelCollection;
  newsArticles: any[] = [];
  randomArticles: any[] = []; // Randomly selected articles
  selectedArticle: any = null;
  modalArticle: any = null;

  constructor(private newsService: NewsService) {}

  ngOnInit(): void {

    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlMzI0ZmE4NS01ZGNlLTQyMjYtOTY2ZS00NmU3NDYyODA4YTAiLCJpZCI6MjgzNjA0LCJpYXQiOjE3NDE3ODEwODB9.EOLsNcGovIeFjEs-_1M70IXMIBiQTgMdB-0OY9pEaZk';

    // Initialize Cesium Viewer with the terrain provider
    createWorldTerrainAsync().then((terrainProvider) => {
      this.viewer = new Viewer('cesiumContainer', {
        terrainProvider: terrainProvider,
        animation: false,
        timeline: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
      });

      this.setInitialCameraView();
      this.addClickListener();
      this.enableRotation();

      // Configure the clock for rotation
      this.viewer.clock.multiplier = 1000;
      this.viewer.clock.shouldAnimate = true;

      // ✅ Now it's safe to access `scene`, `camera`, and `globe`
      const scene = this.viewer.scene;
      const camera = this.viewer.camera;
      const globe = scene.globe;

      let lastExecutionTime = 0;
      const interval = 5000; // 5 seconds

      this.viewer.clock.onTick.addEventListener(() => {
        const currentTime = Date.now();
        
        if (currentTime - lastExecutionTime >= interval) {
          lastExecutionTime = currentTime;
          
          const cartographic = globe.ellipsoid.cartesianToCartographic(camera.position);
          const longitude = Cesium.Math.toDegrees(cartographic.longitude);
          const latitude = Cesium.Math.toDegrees(cartographic.latitude);

          this.fetchNewsForLocation(latitude, longitude);
        }
      });
    }).catch((error) => {
      console.error("Error loading terrain:", error);
    });
  }

  setInitialCameraView(): void {
    if (this.viewer) {
      this.viewer.camera.setView({
        destination: Cartesian3.fromDegrees(-3.7038, 40.4168, 20000000), // Adjusted height
        orientation: {
          heading: CesiumMath.toRadians(0),
          pitch: CesiumMath.toRadians(-90), // More directly overhead
          roll: CesiumMath.toRadians(0)
        }
      });
    }
  }

  async getLocationDetails(latitude: number, longitude: number): Promise<{
    country: string;
    city?: string;
    state?: string;
  }> {
    try {
      // Add a random number to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&` +
        `_=${timestamp}`,
        {
          headers: {
            'Accept-Language': 'en', // Get results in English
            'User-Agent': 'CesiumGlobeApp/1.0' // Identify your application as per Nominatim's usage policy
          }
        }
      );

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      return {
        country: data.address.country || 'Unknown Country',
        city: data.address.city || data.address.town || data.address.village,
        state: data.address.state
      };
    } catch (error) {
      console.error('Error fetching location details:', error);
      return {
        country: 'Error fetching location'
      };
    }
  }

  addClickListener(): void {
    const handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);
    
    // Add a simple loading indicator to the DOM
    const loadingDiv = document.createElement('div');
    loadingDiv.style.display = 'none';
    loadingDiv.style.position = 'fixed';
    loadingDiv.style.top = '50%';
    loadingDiv.style.left = '50%';
    loadingDiv.style.transform = 'translate(-50%, -50%)';
    loadingDiv.style.padding = '10px';
    loadingDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
    loadingDiv.style.color = 'white';
    loadingDiv.style.borderRadius = '5px';
    loadingDiv.style.zIndex = '1000';
    loadingDiv.textContent = 'Loading location details...';
    document.body.appendChild(loadingDiv);

    handler.setInputAction(async (event: { position: any; }) => {
        const windowPosition = event.position;
        const ray = this.viewer.camera.getPickRay(windowPosition);
        
        if (ray) {
            const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
            
            if (cartesian && !Cartesian3.ZERO.equals(cartesian)) {
                const cartographic = Cartographic.fromCartesian(cartesian);
                const longitude = CesiumMath.toDegrees(cartographic.longitude);
                const latitude = CesiumMath.toDegrees(cartographic.latitude);
                const height = cartographic.height;

                // Round coordinates
                const roundedLon = Math.round(longitude * 10000) / 10000;
                const roundedLat = Math.round(latitude * 10000) / 10000;
                const roundedHeight = Math.round(height);

                // Show loading indicator
                loadingDiv.style.display = 'block';

                try {
                    // Get location details
                    const locationInfo = await this.getLocationDetails(roundedLat, roundedLon);

                    // Build location message
                    let locationMessage = `Location Details:\n`;
                    locationMessage += `Country: ${locationInfo.country}\n`;
                    if (locationInfo.state) {
                        locationMessage += `State/Region: ${locationInfo.state}\n`;
                    }
                    if (locationInfo.city) {
                        locationMessage += `City: ${locationInfo.city}\n`;
                    }
                    locationMessage += `Longitude: ${roundedLon}°\n`;
                    locationMessage += `Latitude: ${roundedLat}°\n`;
                    locationMessage += `Height: ${roundedHeight}m`;

                    this.addNewsPulseEffect(roundedLat, roundedLon);
                    this.fetchNewsForLocation(roundedLat, roundedLon);
                    // Show the alert
                    alert(locationMessage);

                } finally {
                    // Hide loading indicator
                    loadingDiv.style.display = 'none';
                }
            }
        }
    }, ScreenSpaceEventType.LEFT_CLICK);
  }

  enableRotation(): void {
    if (this.viewer) {
      const camera = this.viewer.camera;
      const rotationSpeed = CesiumMath.toRadians(0.05);
  
      this.viewer.scene.postRender.addEventListener(() => {
        camera.rotate(Cartesian3.UNIT_Z, -rotationSpeed);
      });
    }
  }

  fetchNewsForLocation(latitude: number, longitude: number) {
    this.newsService.getNewsByCoordinates(latitude, longitude).subscribe(
      (data: any) => {
        if (data.articles && data.articles.length > 0) {
          // Select 5 random articles
          this.randomArticles = this.getRandomArticles(data.articles, 5);
          this.addNewsPulseEffect(latitude, longitude);

        } else {
          console.warn("No news found, falling back to world news.");
          this.fetchFallbackNews();
        }
      },
      (error: any) => {
        console.error("Error fetching news:", error);
        this.fetchFallbackNews();
      }
    );
  }
  
  fetchFallbackNews() {
    const fallbackQuery = "World News"; // Can also use "New York News"
    console.log(`Fetching fallback news for: ${fallbackQuery}`);
  
    this.newsService.getFallbackNews(fallbackQuery).subscribe(
      (fallbackData: any) => {
        this.randomArticles = this.getRandomArticles(fallbackData.articles, 5);
      },
      (fallbackError: any) => {
        console.error("Error fetching fallback news:", fallbackError);
        this.randomArticles = [{ title: "No news available at the moment." }];
      }
    );
  }  

    // Method to get random articles
    getRandomArticles(articles: any[], count: number): any[] {
      const shuffled = articles.sort(() => 0.5 - Math.random()); // Shuffle the array
      return shuffled.slice(0, count); // Get the first `count` articles
    }

  // Show article details in `.article-details`
  setSelectedArticle(article: any, event: Event) {
    event.preventDefault(); // Prevents page reload
    this.selectedArticle = article;
  }

  // Open modal
  openModal(article: any, event: Event) {
    event.preventDefault();
    this.modalArticle = article;
  }

  // Close modal
  closeModal(event: Event) {
    this.modalArticle = null;
  }

  getFullText(article: any): string {
    if (!article.content) {
      return article.description || "No additional content available.";
    }
    return article.content.includes("[+") ? article.description || article.content : article.content;
  }

  addNewsPulseEffect(latitude: number, longitude: number) {
    const viewer = this.viewer;
    const position = Cesium.Cartesian3.fromDegrees(longitude, latitude);
    
    const startTime = Cesium.JulianDate.now(); // Ensure a valid start time
  
    // Create a pulsating wave effect
    const entity = viewer.entities.add({
      position: position,
      ellipse: {
        semiMinorAxis: new Cesium.CallbackProperty((time, result) => {
          const currentTime = time ?? Cesium.JulianDate.now(); // Avoid undefined time
          return 100000 + Math.sin(Cesium.JulianDate.secondsDifference(currentTime, startTime) * 3) * 50000;
        }, false),
        semiMajorAxis: new Cesium.CallbackProperty((time, result) => {
          const currentTime = time ?? Cesium.JulianDate.now();
          return 100000 + Math.sin(Cesium.JulianDate.secondsDifference(currentTime, startTime) * 3) * 50000;
        }, false),
        material: new Cesium.ColorMaterialProperty(
          new Cesium.CallbackProperty((time, result) => {
            const currentTime = time ?? Cesium.JulianDate.now();
            const alpha = 0.6 - Math.abs(Math.sin(Cesium.JulianDate.secondsDifference(currentTime, startTime) * 3) * 0.6);
            return Cesium.Color.RED.withAlpha(alpha);
          }, false)
        ),
        height: 0, // Keep it at ground level
      }
    });
  
    // Remove the effect after 7 seconds (increase duration if needed)
    setTimeout(() => {
      viewer.entities.remove(entity);
    }, 7000);
  }

}



