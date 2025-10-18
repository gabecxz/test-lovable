from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Tuple
import uuid
from datetime import datetime, timezone
from haversine import haversine, Unit
import itertools

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class Driver(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    license_plate: str
    vehicle_type: str
    status: str = "ocioso"  # ocioso, em_entrega, voltando
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DriverCreate(BaseModel):
    name: str
    phone: str
    license_plate: str
    vehicle_type: str

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    license_plate: Optional[str] = None
    vehicle_type: Optional[str] = None
    status: Optional[str] = None

class Delivery(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    address: str
    customer: str
    scheduled_time: Optional[str] = None
    status: str = "pendente"  # pendente, em_andamento, entregue, cancelada
    latitude: float
    longitude: float
    driver_id: Optional[str] = None
    distance_km: Optional[float] = None
    estimated_time_minutes: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class DeliveryCreate(BaseModel):
    address: str
    customer: str
    scheduled_time: Optional[str] = None
    latitude: float
    longitude: float

class DeliveryUpdate(BaseModel):
    address: Optional[str] = None
    customer: Optional[str] = None
    scheduled_time: Optional[str] = None
    status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    driver_id: Optional[str] = None
    distance_km: Optional[float] = None
    estimated_time_minutes: Optional[float] = None

class RouteOptimization(BaseModel):
    delivery_ids: List[str]
    start_latitude: float = -23.5505  # São Paulo default
    start_longitude: float = -46.6333
    average_speed_kmh: float = 40.0

class OptimizedRoute(BaseModel):
    optimized_order: List[str]
    total_distance_km: float
    total_time_minutes: float
    route_points: List[dict]

# Route Optimization Algorithm
def calculate_distance(point1: Tuple[float, float], point2: Tuple[float, float]) -> float:
    """Calculate distance between two points using haversine formula"""
    return haversine(point1, point2, unit=Unit.KILOMETERS)

def nearest_neighbor_tsp(start_point: Tuple[float, float], 
                         deliveries: List[dict]) -> Tuple[List[dict], float]:
    """Solve TSP using nearest neighbor algorithm"""
    if not deliveries:
        return [], 0.0
    
    unvisited = deliveries.copy()
    route = []
    current_point = start_point
    total_distance = 0.0
    
    while unvisited:
        nearest = min(unvisited, 
                     key=lambda d: calculate_distance(current_point, (d['latitude'], d['longitude'])))
        distance = calculate_distance(current_point, (nearest['latitude'], nearest['longitude']))
        total_distance += distance
        route.append(nearest)
        current_point = (nearest['latitude'], nearest['longitude'])
        unvisited.remove(nearest)
    
    return route, total_distance

# Driver Routes
@api_router.post("/drivers", response_model=Driver)
async def create_driver(driver_data: DriverCreate):
    driver = Driver(**driver_data.model_dump())
    doc = driver.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.drivers.insert_one(doc)
    return driver

@api_router.get("/drivers", response_model=List[Driver])
async def get_drivers():
    drivers = await db.drivers.find({}, {"_id": 0}).to_list(1000)
    for driver in drivers:
        if isinstance(driver.get('created_at'), str):
            driver['created_at'] = datetime.fromisoformat(driver['created_at'])
    return drivers

@api_router.get("/drivers/{driver_id}", response_model=Driver)
async def get_driver(driver_id: str):
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    if isinstance(driver.get('created_at'), str):
        driver['created_at'] = datetime.fromisoformat(driver['created_at'])
    return driver

@api_router.put("/drivers/{driver_id}", response_model=Driver)
async def update_driver(driver_id: str, driver_data: DriverUpdate):
    update_data = {k: v for k, v in driver_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.drivers.update_one(
        {"id": driver_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if isinstance(driver.get('created_at'), str):
        driver['created_at'] = datetime.fromisoformat(driver['created_at'])
    return driver

@api_router.delete("/drivers/{driver_id}")
async def delete_driver(driver_id: str):
    result = await db.drivers.delete_one({"id": driver_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"message": "Driver deleted successfully"}

# Delivery Routes
@api_router.post("/deliveries", response_model=Delivery)
async def create_delivery(delivery_data: DeliveryCreate):
    delivery = Delivery(**delivery_data.model_dump())
    doc = delivery.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    if doc.get('completed_at'):
        doc['completed_at'] = doc['completed_at'].isoformat()
    await db.deliveries.insert_one(doc)
    return delivery

@api_router.get("/deliveries", response_model=List[Delivery])
async def get_deliveries(status: Optional[str] = None):
    query = {}
    if status:
        query['status'] = status
    
    deliveries = await db.deliveries.find(query, {"_id": 0}).to_list(1000)
    for delivery in deliveries:
        if isinstance(delivery.get('created_at'), str):
            delivery['created_at'] = datetime.fromisoformat(delivery['created_at'])
        if delivery.get('completed_at') and isinstance(delivery['completed_at'], str):
            delivery['completed_at'] = datetime.fromisoformat(delivery['completed_at'])
    return deliveries

@api_router.get("/deliveries/{delivery_id}", response_model=Delivery)
async def get_delivery(delivery_id: str):
    delivery = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if isinstance(delivery.get('created_at'), str):
        delivery['created_at'] = datetime.fromisoformat(delivery['created_at'])
    if delivery.get('completed_at') and isinstance(delivery['completed_at'], str):
        delivery['completed_at'] = datetime.fromisoformat(delivery['completed_at'])
    return delivery

@api_router.put("/deliveries/{delivery_id}", response_model=Delivery)
async def update_delivery(delivery_id: str, delivery_data: DeliveryUpdate):
    update_data = {k: v for k, v in delivery_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # If status is being updated to 'entregue', set completed_at
    if update_data.get('status') == 'entregue':
        update_data['completed_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.deliveries.update_one(
        {"id": delivery_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    delivery = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
    if isinstance(delivery.get('created_at'), str):
        delivery['created_at'] = datetime.fromisoformat(delivery['created_at'])
    if delivery.get('completed_at') and isinstance(delivery['completed_at'], str):
        delivery['completed_at'] = datetime.fromisoformat(delivery['completed_at'])
    return delivery

@api_router.delete("/deliveries/{delivery_id}")
async def delete_delivery(delivery_id: str):
    result = await db.deliveries.delete_one({"id": delivery_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return {"message": "Delivery deleted successfully"}

# Route Optimization
@api_router.post("/optimize-route", response_model=OptimizedRoute)
async def optimize_route(route_data: RouteOptimization):
    # Get deliveries
    deliveries = []
    for delivery_id in route_data.delivery_ids:
        delivery = await db.deliveries.find_one({"id": delivery_id}, {"_id": 0})
        if delivery:
            deliveries.append(delivery)
    
    if not deliveries:
        raise HTTPException(status_code=404, detail="No deliveries found")
    
    # Optimize route using nearest neighbor
    start_point = (route_data.start_latitude, route_data.start_longitude)
    optimized_deliveries, total_distance = nearest_neighbor_tsp(start_point, deliveries)
    
    # Calculate total time
    total_time_minutes = (total_distance / route_data.average_speed_kmh) * 60
    
    # Create route points
    route_points = [{
        "id": "start",
        "latitude": route_data.start_latitude,
        "longitude": route_data.start_longitude,
        "type": "start"
    }]
    
    for i, delivery in enumerate(optimized_deliveries):
        route_points.append({
            "id": delivery['id'],
            "latitude": delivery['latitude'],
            "longitude": delivery['longitude'],
            "address": delivery['address'],
            "customer": delivery['customer'],
            "order": i + 1,
            "type": "delivery"
        })
    
    return OptimizedRoute(
        optimized_order=[d['id'] for d in optimized_deliveries],
        total_distance_km=round(total_distance, 2),
        total_time_minutes=round(total_time_minutes, 2),
        route_points=route_points
    )

# Assign delivery to driver
@api_router.post("/deliveries/{delivery_id}/assign/{driver_id}")
async def assign_delivery(delivery_id: str, driver_id: str):
    # Check if driver exists and is available
    driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    # Update delivery
    result = await db.deliveries.update_one(
        {"id": delivery_id},
        {"$set": {"driver_id": driver_id, "status": "em_andamento"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    # Update driver status
    await db.drivers.update_one(
        {"id": driver_id},
        {"$set": {"status": "em_entrega"}}
    )
    
    return {"message": "Delivery assigned successfully"}

# Statistics
@api_router.get("/statistics")
async def get_statistics():
    total_deliveries = await db.deliveries.count_documents({})
    pending_deliveries = await db.deliveries.count_documents({"status": "pendente"})
    in_progress_deliveries = await db.deliveries.count_documents({"status": "em_andamento"})
    completed_deliveries = await db.deliveries.count_documents({"status": "entregue"})
    total_drivers = await db.drivers.count_documents({})
    active_drivers = await db.drivers.count_documents({"status": "em_entrega"})
    
    return {
        "total_deliveries": total_deliveries,
        "pending_deliveries": pending_deliveries,
        "in_progress_deliveries": in_progress_deliveries,
        "completed_deliveries": completed_deliveries,
        "total_drivers": total_drivers,
        "active_drivers": active_drivers
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()