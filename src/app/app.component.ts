import { Component, OnInit, AfterViewInit } from '@angular/core';
import { Viewer, Cartesian3, Math as CesiumMath, createWorldTerrainAsync } from 'cesium';
import { ScreenSpaceEventHandler, ScreenSpaceEventType, Ellipsoid, Cartographic } from 'cesium';
import { LabelCollection } from 'cesium';
import * as Cesium from 'cesium';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  viewer!: Viewer;
  labels!: LabelCollection;

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

      // Set the initial camera position and orientation
      this.setInitialCameraView();

      // Add arrows (billboards) to the globe
      this.addArrows();

      // Configure the clock for rotation
      this.viewer.clock.multiplier = 1000; // Controls the speed of Earth's rotation
      this.viewer.clock.shouldAnimate = true; // Enables continuous animation
    }).catch((error) => {
      console.error("Error loading terrain:", error);
    });
  }

  setInitialCameraView(): void {
    // Ensure viewer is initialized before setting the camera position
    if (this.viewer) {
      // Adjusted camera position and orientation
      this.viewer.camera.setView({
        destination: Cartesian3.fromDegrees(-3.7038, 40.4168, 18000000),  // Longitude, Latitude, Height (balanced view)
        orientation: {
          heading: CesiumMath.toRadians(0), // Facing north
          pitch: CesiumMath.toRadians(-85), // Moderate downward tilt (adjusted)
          roll: CesiumMath.toRadians(0) // No roll
        }
      });
    }
  }


  // Add arrow (billboards) at specific coordinates
  addArrows(): void {
    if (this.viewer) {
      // Create a BillboardCollection to hold the arrows
      const scene = this.viewer.scene;
      const billboardCollection = scene.primitives.add(new Cesium.BillboardCollection());

      // Define the locations for the arrows (geographical points)
      const arrowLocations = [
        { lon: -3.7038, lat: 40.4168, height: 10000000, text: 'Point 1' }, // Example: Madrid, Spain
        { lon: -74.0060, lat: 40.7128, height: 10000000, text: 'Point 2' }, // Example: New York, USA
      ];

      // Create arrows at the defined locations
      arrowLocations.forEach(location => {
        const position = Cartesian3.fromDegrees(location.lon, location.lat, location.height);

        billboardCollection.add({
          image: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Arrow_up.svg', // You can replace this URL with any arrow image
          position: position,
          scale: 0.1, // Adjust the size of the arrow
          id: location.text // Label the arrow
        });

        // Add a label for the arrow location
        this.viewer.scene.primitives.add(new Cesium.LabelCollection()).add({
          position: position,
          text: location.text,
          font: '18px Helvetica',
          fillColor: Cesium.Color.WHITE,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineWidth: 2,
          pixelOffset: new Cesium.Cartesian2(0, -20)
        });
      });
    }
  }

  ngAfterViewInit(): void {
    this.viewer = new Viewer('cesiumContainer', {
      animation: false,
      timeline: false
    });

    this.addClickListener();

    // Ensure viewer is initialized before setting the camera position
    if (this.viewer) {
      // Adjusted camera position and orientation
      this.viewer.camera.setView({
        destination: Cartesian3.fromDegrees(-3.7038, 40.4168, 20000000),  // Longitude, Latitude, Height (balanced view)
        orientation: {
          heading: CesiumMath.toRadians(0), // Facing north
          pitch: CesiumMath.toRadians(-90), // Moderate downward tilt (adjusted)
          roll: CesiumMath.toRadians(0) // No roll
        }
      });
    }

    // Enable rotation
    this.enableRotation();

  }

  addClickListener(): void {
    const handler = new ScreenSpaceEventHandler(this.viewer.scene.canvas);

    handler.setInputAction((event: { position: any; }) => {
      // Get the position of the click in window coordinates
      const windowPosition = event.position;

      // Use the pickPosition function to get the Cartesian3 coordinates
      const cartesian = this.viewer.scene.pickPosition(windowPosition);

      if (cartesian) {
        // Convert Cartesian3 to Cartographic (longitude, latitude, height)
        const cartographic = Cartographic.fromCartesian(cartesian, Ellipsoid.WGS84);
        const longitude = CesiumMath.toDegrees(cartographic.longitude);
        const latitude = CesiumMath.toDegrees(cartographic.latitude);
        const height = cartographic.height;

        console.log(`Longitude: ${longitude}, Latitude: ${latitude}, Height: ${height}`);
        alert(`Clicked Coordinates:\nLongitude: ${longitude}\nLatitude: ${latitude}\nHeight: ${height}`);
      } else {
        console.log('No position found.');
      }
    }, ScreenSpaceEventType.LEFT_CLICK);
  }

  enableRotation(): void {
    if (this.viewer) {
      const camera = this.viewer.camera;
  
      // Speed of rotation in radians per frame
      const rotationSpeed = CesiumMath.toRadians(0.05); // Adjust for desired rotation speed
  
      // Add a postRender event listener to perform rotation
      this.viewer.scene.postRender.addEventListener(() => {
        // Rotate the camera around the Earth's vertical axis (UNIT_Z)
        camera.rotate(Cartesian3.UNIT_Z, -rotationSpeed); // Negative for eastward rotation
      });
    }
  }
  

}
