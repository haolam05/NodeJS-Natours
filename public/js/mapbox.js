/* eslint-disable */
const locations = JSON.parse(document.getElementById('map').dataset.locations);
console.log(locations);

mapboxgl.accessToken =
  'pk.eyJ1IjoiaGFvbGFtMDUiLCJhIjoiY2xrdzl5Yzh5MGk3bTNjbXo0Z3dvdml5NCJ9.SU6gr-0RZENJCLOPp6W40g';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v10',
});
