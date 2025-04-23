from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"categories", views.CategoryViewSet)
router.register(r"items", views.ItemViewSet)
router.register(r"orders", views.OrderViewSet, basename="order")
router.register(r"reviews", views.ReviewViewSet, basename="review")
router.register(r"wishlist", views.WishlistViewSet, basename="wishlist")

urlpatterns = [
    path("", include(router.urls)),
]
