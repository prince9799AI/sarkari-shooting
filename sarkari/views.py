from django.shortcuts import render
from django.views import View


class IndexView(View):
    template_name = "index.html"

    def get(self, request):
        context = {}
        return render(request, self.template_name, context)


class NewDesigneView(View):
    template_name = "new_designe.html"

    def get(self, request):
        context = {}
        return render(request, self.template_name, context)


class ContactView(View):
    template_name = "contact.html"

    def get(self, request):
        context = {}
        return render(request, self.template_name, context)
