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

  constructor(private newsService: NewsService) {}

  ngOnInit(): void {
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
    }).catch((error) => {
      console.error("Error loading terrain:", error);
    });

    // Example: Fetch news for a default location on init
    this.fetchNewsForLocation(40.7128, -74.0060); // New York coordinates
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
        this.newsArticles = data.articles;
      },
      (error: any) => {
        console.error('Error fetching news:', error);
        this.newsArticles = [{ title: 'Failed to fetch news. Please try again later.' }];
      }
    );
  }
}



